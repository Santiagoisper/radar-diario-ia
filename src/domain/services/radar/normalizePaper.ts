import type { Paper } from "../../models";
import type { IngestedPaperPayload } from "./types";

function isNewToday(dateIso: string, todayDate: string): boolean {
  return dateIso.slice(0, 10) === todayDate;
}

/** Normaliza payload bruto a entidad Paper. */
export function normalizePaper(payload: IngestedPaperPayload, todayDate = "2026-05-05"): Paper {
  const stableId = payload.external_id.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();

  return {
    id: `paper-${stableId}`,
    external_id: payload.external_id,
    source_id: payload.source_id,
    title: payload.title.trim(),
    abstract: payload.abstract.trim(),
    authors: payload.authors.map((author) => author.trim()).filter(Boolean),
    published_at: payload.published_at,
    updated_at: payload.updated_at,
    categories: [...new Set(payload.categories.map((category) => category.trim()))],
    url: payload.url,
    raw_payload: payload.raw_payload,
    is_new_today: isNewToday(payload.published_at, todayDate),
  };
}
