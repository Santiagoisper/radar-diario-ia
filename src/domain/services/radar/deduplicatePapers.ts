import type { Paper } from "../../models";

/** Deduplica por external_id preservando la versión más actualizada. */
export function deduplicatePapers(papers: Paper[]): Paper[] {
  const byExternalId = new Map<string, Paper>();

  papers.forEach((paper) => {
    const existing = byExternalId.get(paper.external_id);

    if (!existing) {
      byExternalId.set(paper.external_id, paper);
      return;
    }

    const currentUpdated = new Date(existing.updated_at).getTime();
    const nextUpdated = new Date(paper.updated_at).getTime();

    if (nextUpdated >= currentUpdated) {
      byExternalId.set(paper.external_id, paper);
    }
  });

  return [...byExternalId.values()];
}
