/**
 * Pure utilities for per-category arXiv fetching and deduplication.
 * Dependencies are injected so this module is testable without importing
 * the main ingest-and-push.mjs (which has top-level guards and side effects).
 */

/**
 * Deduplicates payloads by external_id, preserving the first occurrence.
 * A paper appearing in multiple category feeds keeps the source_id from
 * whichever category fetched it first.
 */
export function deduplicateByExternalId(payloads) {
  const seen = new Map();
  for (const p of payloads) {
    if (!seen.has(p.external_id)) seen.set(p.external_id, p);
  }
  return [...seen.values()];
}

/**
 * Fetches each category individually with an inter-category delay.
 * On per-category failure: logs and continues. Never throws.
 * Returns { payloads, failedCategories } — caller decides what to do with empty payloads.
 *
 * @param {string[]} categories
 * @param {number} perCatMax
 * @param {{ fetchForCategory: Function, parseFeed: Function, delayMs: Function }} deps
 */
export async function fetchAllCategories(categories, perCatMax, deps) {
  const { fetchForCategory, parseFeed, delayMs } = deps;
  const allPayloads = [];
  const failedCategories = [];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    try {
      const xml = await fetchForCategory([cat], perCatMax);
      const results = parseFeed(xml, [cat]);
      console.log(`category ${cat}: ${results.length} papers fetched`);
      allPayloads.push(...results);
    } catch (e) {
      console.warn(`category ${cat}: failed (${e.message})`);
      failedCategories.push(cat);
    }
    if (i < categories.length - 1) await delayMs();
  }

  return { payloads: allPayloads, failedCategories };
}
