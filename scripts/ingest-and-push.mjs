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

const ARXIV_API = "https://export.arxiv.org/api/query";
const VERCEL_URL = process.env.VERCEL_URL?.replace(/\/$/, "") ?? "https://radar-diario-ia.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET;
const CATEGORIES = (process.env.ARXIV_CATEGORIES ?? "cs.AI,cs.LG,cs.CL").split(",").map((c) => c.trim()).filter(Boolean);
const MAX_RESULTS = Number(process.env.ARXIV_MAX_RESULTS ?? 25);
const TODAY = new Date().toISOString().slice(0, 10);

if (!CRON_SECRET) {
  console.error("❌ CRON_SECRET no está configurado");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchArxiv(categories, maxResults) {
  const orQuery = categories.map((c) => `cat:${c}`).join("+OR+");
  const url = `${ARXIV_API}?search_query=${encodeURIComponent(`(${orQuery})`)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;

  console.log(`📡 Consultando arXiv: ${categories.join(", ")} (max ${maxResults})`);
  console.log(`   URL: ${url}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30_000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);

      if (!res.ok) {
        throw new Error(`arXiv HTTP ${res.status}`);
      }

      const xml = await res.text();
      console.log(`✅ arXiv respondió (${xml.length} bytes)`);
      return xml;
    } catch (e) {
      console.warn(`⚠️  Intento ${attempt}/3 falló: ${e.message}`);
      if (attempt < 3) await sleep(2 ** attempt * 1000);
    }
  }
  throw new Error("arXiv no respondió después de 3 intentos");
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

    const authors = (entry.author ?? []).map((a) =>
      typeof a === "string" ? a : String(a.name ?? "")
    ).filter(Boolean);

    const entryCategories = (entry.category ?? []).map((c) =>
      typeof c === "string" ? c : String(c["@_term"] ?? "")
    ).filter(Boolean);

    // Determinar source_id según la primera categoría que matchea
    const matchedCategory = entryCategories.find((c) => categorySet.has(c)) ?? entryCategories[0] ?? "arxiv";
    const sourceId = `arxiv_${matchedCategory.replace(".", "_")}`;

    return {
      source_id: sourceId,
      external_id: externalId,
      title: String(entry.title ?? "").replace(/\s+/g, " ").trim(),
      abstract: String(entry.summary ?? "").replace(/\s+/g, " ").trim(),
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
console.log(`\n🗓  Radar diario — ${TODAY}`);
console.log(`📂 Categorías: ${CATEGORIES.join(", ")}`);

const xml = await fetchArxiv(CATEGORIES, MAX_RESULTS);
const payloads = parseArxivXml(xml, CATEGORIES);

if (payloads.length === 0) {
  console.warn("⚠️  Sin papers — enviando igualmente para que el pipeline use seeds");
}

await postToVercel(payloads, TODAY);

console.log("\n✅ ingest-and-push completado");
