/**
 * scripts/ingest-and-push.mjs
 *
 * Corre en GitHub Actions (Node.js 20, IP no bloqueada por arXiv).
 * 1. Llama a la API de arXiv para las categorías configuradas.
 * 2. Parsea el Atom XML a IngestedPaperPayload[].
 * 3. POST /api/radar/ingest con los payloads → Vercel corre el pipeline y persiste.
 *
 * Variables de entorno requeridas:
 *   VERCEL_URL      → URL base de producción (ej: https://radar-diario-ia.vercel.app)
 *   CRON_SECRET     → mismo secret que usa Vercel
 *   ARXIV_CATEGORIES → categorías separadas por coma (default: cs.AI,cs.LG,cs.CL)
 *   ARXIV_MAX_RESULTS → número de papers por request (default: 25)
 */

import { XMLParser } from "fast-xml-parser";
import { retryDelayMs } from "./lib/retryDelay.mjs";
import { deduplicateByExternalId, fetchAllCategories } from "./lib/arxivUtils.mjs";

const ARXIV_API = "https://export.arxiv.org/api/query";
const VERCEL_URL = process.env.VERCEL_URL?.replace(/\/$/, "") ?? "https://radar-diario-ia.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET;
const CATEGORIES = (process.env.ARXIV_CATEGORIES ?? "cs.AI,cs.LG,cs.CL")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
const MAX_RESULTS = Number(process.env.ARXIV_MAX_RESULTS ?? 25);
const RUN_DATE = process.env.RADAR_DATE?.trim() || new Date().toISOString().slice(0, 10);
const ARXIV_ATTEMPTS = Number(process.env.ARXIV_ATTEMPTS ?? 5);
const INTER_CATEGORY_DELAY_MS = Number(process.env.INTER_CATEGORY_DELAY_MS ?? 5_000);
const PER_CAT_MAX = Math.max(8, Math.min(25, Math.floor(MAX_RESULTS / Math.max(1, CATEGORIES.length))));
const USER_AGENT = "radar-diario-ia/0.1 (https://github.com/Santiagoisper/radar-diario-ia)";

if (!CRON_SECRET) {
  console.error("❌ CRON_SECRET no está configurado");
  process.exit(1);
}

if (!Number.isFinite(MAX_RESULTS) || MAX_RESULTS < 1) {
  console.error(`❌ ARXIV_MAX_RESULTS inválido: ${process.env.ARXIV_MAX_RESULTS}`);
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildArxivUrl(categories, maxResults) {
  const search = `(${categories.map((c) => `cat:${c}`).join(" OR ")})`;
  const params = new URLSearchParams({
    search_query: search,
    start: "0",
    max_results: String(maxResults),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  return `${ARXIV_API}?${params.toString()}`;
}

async function fetchArxiv(categories, maxResults) {
  const url = buildArxivUrl(categories, maxResults);

  console.log(`📡 Consultando arXiv: ${categories.join(", ")} (max ${maxResults})`);
  console.log(`   URL: ${url}`);

  let lastError = null;
  for (let attempt = 1; attempt <= ARXIV_ATTEMPTS; attempt++) {
    let res = null;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60_000);
      res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      clearTimeout(t);

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`arXiv HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ""}`);
      }

      const xml = await res.text();
      console.log(`✅ arXiv respondió (${xml.length} bytes)`);
      return xml;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`⚠️  Intento ${attempt}/${ARXIV_ATTEMPTS} falló: ${lastError.message}`);
      if (attempt < ARXIV_ATTEMPTS) {
        const waitMs = retryDelayMs(res, attempt);
        console.warn(`   Reintentando en ${Math.round(waitMs / 1000)}s...`);
        await sleep(waitMs);
      }
    }
  }

  throw lastError ?? new Error("arXiv no respondió");
}

function sourceIdForCategory(category) {
  return `source-arxiv-${category.toLowerCase().replace(".", "-")}`;
}

function parseArxivXml(xml, categories) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => ["entry", "author", "category"].includes(name),
  });

  const feed = parser.parse(xml);
  const entries = feed?.feed?.entry ?? [];

  if (entries.length === 0) {
    console.warn("⚠️  arXiv devolvió feed vacío");
    return [];
  }

  const categorySet = new Set(categories);

  const payloads = entries.map((entry) => {
    const id = String(entry.id ?? "").trim();
    const externalId = id.split("/abs/").pop() ?? id;

    const authors = (entry.author ?? [])
      .map((a) => (typeof a === "string" ? a : String(a.name ?? "")))
      .filter(Boolean);

    const entryCategories = (entry.category ?? [])
      .map((c) => (typeof c === "string" ? c : String(c["@_term"] ?? "")))
      .filter(Boolean);

    // Determinar source_id según la primera categoría que matchea
    const matchedCategory = entryCategories.find((c) => categorySet.has(c)) ?? entryCategories[0] ?? "arxiv";
    const sourceId = sourceIdForCategory(matchedCategory);
    const externalIdWithoutVersion = externalId.replace(/v\d+$/i, "");

    return {
      source_id: sourceId,
      external_id: externalIdWithoutVersion.startsWith("arxiv:")
        ? externalIdWithoutVersion
        : `arxiv:${externalIdWithoutVersion}`,
      title: String(entry.title ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      abstract: String(entry.summary ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      authors,
      published_at: String(entry.published ?? new Date().toISOString()),
      updated_at: String(entry.updated ?? new Date().toISOString()),
      categories: entryCategories,
      url: id,
      raw_payload: entry,
    };
  });

  console.log(`📄 Parseados ${payloads.length} papers`);
  return payloads;
}

async function postToVercel(payloads, date) {
  const url = `${VERCEL_URL}/api/radar/ingest`;
  console.log(`\n🚀 POST ${url}`);
  console.log(`   date: ${date}, payloads: ${payloads.length}`);

  const body = JSON.stringify({ date, source: "live", payloads });

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(t);

    const json = await res.json().catch(() => ({}));

    if (res.status === 202) {
      console.log(`✅ Vercel aceptó el ingest: ${JSON.stringify(json)}`);
    } else {
      console.error(`❌ Vercel respondió ${res.status}: ${JSON.stringify(json)}`);
      process.exit(1);
    }
  } catch (e) {
    clearTimeout(t);
    console.error(`❌ Error al llamar a Vercel: ${e.message}`);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🗓  Radar diario — ${RUN_DATE}`);
console.log(
  `📂 Categorías: ${CATEGORIES.join(", ")} — ${PER_CAT_MAX} papers/cat, ${INTER_CATEGORY_DELAY_MS / 1000}s inter-category delay`,
);

const { payloads: merged, failedCategories } = await fetchAllCategories(CATEGORIES, PER_CAT_MAX, {
  fetchForCategory: fetchArxiv,
  parseFeed: parseArxivXml,
  delayMs: () => sleep(INTER_CATEGORY_DELAY_MS),
});
const payloads = deduplicateByExternalId(merged);

const failNote = failedCategories.length > 0 ? ` Failed: ${failedCategories.join(", ")}` : "";
console.log(`📊 Merged: ${merged.length} papers → ${payloads.length} unique after dedup.${failNote}`);

if (payloads.length === 0) {
  console.error("❌ All categories failed — no real payloads fetched. Not calling postToVercel.");
  process.exit(1);
}

await postToVercel(payloads, RUN_DATE);

console.log("\n✅ ingest-and-push completado");
