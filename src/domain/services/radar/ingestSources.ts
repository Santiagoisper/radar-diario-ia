import { papersSeed } from "../../../data/seeds";
import type { Source } from "../../models";
import type { IngestedPaperPayload } from "./types";

function mapPaperToPayload(sourceId: string, paper: (typeof papersSeed)[number]): IngestedPaperPayload {
  return {
    source_id: sourceId,
    external_id: paper.external_id,
    title: paper.title,
    abstract: paper.abstract,
    authors: paper.authors,
    published_at: paper.published_at,
    updated_at: paper.updated_at,
    categories: paper.categories,
    url: paper.url,
    raw_payload: {
      provider: "mock-arxiv-fixture",
      originalPaperId: paper.id,
      ...paper.raw_payload,
    },
  };
}

/**
 * Stub de ingestión.
 * Interfaz lista para futuro conector arXiv/RSS, hoy retorna payloads mock normalizados.
 */
export function ingestSources(activeSources: Source[]): IngestedPaperPayload[] {
  const activeCategories = new Set(
    activeSources
      .filter((source) => source.active)
      .map((source) => String(source.config_json.category ?? "")),
  );

  return papersSeed
    .filter((paper) => paper.categories.some((category) => activeCategories.has(category)))
    .map((paper) => {
      const source = activeSources.find((item) =>
        paper.categories.includes(String(item.config_json.category ?? "")),
      );

      return mapPaperToPayload(source?.id ?? paper.source_id, paper);
    });
}
