import { XMLParser } from "fast-xml-parser";
import type { Source } from "../../domain/models";
import type { IngestedPaperPayload } from "../../domain/services/radar/types";

const ARXIV_API = "https://export.arxiv.org/api/query";
let lastFetchAt = 0;
const MIN_INTERVAL_MS = 3500;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function rateLimitArxiv() {
  const now = Date.now();
  const delta = now - lastFetchAt;
  if (delta < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - delta);
  lastFetchAt = Date.now();
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastErr: Error | null = null;
  for (let i = 0; i < 3; i++) {
    await rateLimitArxiv();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.status === 429 || res.status >= 500) {
        await sleep(2 ** i * 500 + Math.random() * 200);
        continue;
      }
      if (!res.ok) throw new Error(`arxiv HTTP ${res.status}`);
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e instanceof Error ? e : new Error(String(e));
      await sleep(2 ** i * 500 + Math.random() * 200);
    }
  }
  throw lastErr ?? new Error("arxiv fetch failed");
}

function categoryQueryPart(category: string): string {
  return `cat:${category.trim()}`;
}

/**
 * Ingesta arXiv API para fuentes activas tipo arxiv_category.
 * Solo debe ejecutarse en servidor (Node/Vercel).
 */
export async function ingestArxivForSources(activeSources: Source[]): Promise<IngestedPaperPayload[]> {
  const categories = new Set<string>();
  for (const s of activeSources) {
    if (s.type !== "arxiv_category") continue;
    const cat = String(s.config_json?.category ?? "");
    if (cat) categories.add(cat);
  }
  if (categories.size === 0) return [];

  const orQuery = [...categories].map(categoryQueryPart).join("+OR+");
  const url = `${ARXIV_API}?search_query=${encodeURIComponent(`(${orQuery})`)}&start=0&max_results=25&sortBy=submittedDate&sortOrder=descending`;
  const res = await fetchWithRetry(url);
  const xml = await res.text();
  return parseArxivFeedXml(xml, activeSources, categories);
}

/** Parsea el Atom de la API arXiv a payloads (sin red). Expuesto para tests unitarios. */
export function parseArxivFeedXml(
  xml: string,
  activeSources: Source[],
  categories: Set<string>,
): IngestedPaperPayload[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const feed = (doc.feed ?? doc) as Record<string, unknown>;
  let entries = feed.entry;
  if (!entries) return [];
  if (!Array.isArray(entries)) entries = [entries];

  const firstCategory = [...categories][0];
  const payloads: IngestedPaperPayload[] = [];
  const seen = new Set<string>();

  for (const entry of entries as Record<string, unknown>[]) {
    const idUrl = String(entry.id ?? "");
    const match = idUrl.match(/arxiv\.org\/abs\/([^/]+)/i);
    const rawId = match ? match[1] : idUrl;
    const externalId = `arxiv:${String(rawId).replace(/v\d+$/i, "")}`;

    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const title = String(entry.title ?? "")
      .replace(/\s+/g, " ")
      .trim();
    const summary = String(entry.summary ?? "");
    const published = String(entry.published ?? "");
    const updated = String(entry.updated ?? published);

    const authorNames: string[] = [];
    const authorsRaw = entry.author;
    if (authorsRaw) {
      const arr = Array.isArray(authorsRaw) ? authorsRaw : [authorsRaw];
      for (const a of arr) {
        const name =
          typeof a === "object" && a !== null && "name" in a
            ? String((a as { name: string }).name)
            : String(a);
        if (name) authorNames.push(name);
      }
    }

    let primaryCategory = firstCategory;
    const pc = entry["arxiv:primary_category"] ?? entry.primary_category;
    if (pc && typeof pc === "object" && pc !== null && "@_term" in pc) {
      primaryCategory = String((pc as { "@_term": string })["@_term"]);
    }

    const categoriesList = primaryCategory ? [primaryCategory] : [...categories];

    const sourceId =
      activeSources.find(
        (s) =>
          s.active &&
          s.type === "arxiv_category" &&
          categoriesList.some((c) => String(s.config_json?.category) === c),
      )?.id ??
      activeSources.find((s) => s.active)?.id ??
      "arxiv";

    payloads.push({
      source_id: sourceId,
      external_id: externalId,
      title: title || "Untitled",
      abstract: summary,
      authors: authorNames.length ? authorNames : ["Unknown"],
      published_at: published || new Date().toISOString(),
      updated_at: updated || published || new Date().toISOString(),
      categories: categoriesList.length ? categoriesList : [...categories],
      url: idUrl.startsWith("http") ? idUrl : `https://arxiv.org/abs/${externalId.replace(/^arxiv:/, "")}`,
      raw_payload: { provider: "arxiv-api", entryId: idUrl },
    });
  }

  return payloads;
}
