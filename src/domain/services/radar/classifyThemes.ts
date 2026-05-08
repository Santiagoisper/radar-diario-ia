import type { Paper, PaperTheme } from "../../models";

function countKeywordHits(text: string, keywords: string[]): number {
  const normalized = text.toLowerCase();

  return keywords.reduce((hits, keyword) => {
    if (normalized.includes(keyword.toLowerCase())) return hits + 1;
    return hits;
  }, 0);
}

function computeConfidence(hits: number, keywordPoolSize: number): number {
  if (hits <= 0 || keywordPoolSize <= 0) return 0;

  const base = hits / Math.max(keywordPoolSize * 0.6, 1);
  return Number(Math.min(0.98, Math.max(0.3, base)).toFixed(2));
}

/**
 * Clasifica temas por keywords de configuración (title + abstract + categories).
 * Permite múltiples temas por paper.
 */
export function classifyThemes(paper: Paper, keywordsByTheme: Record<string, string[]>): PaperTheme[] {
  const textUniverse = `${paper.title} ${paper.abstract} ${paper.categories.join(" ")}`;

  const themes = Object.entries(keywordsByTheme)
    .map(([theme, keywords]) => {
      const hits = countKeywordHits(textUniverse, keywords);
      const confidence = computeConfidence(hits, keywords.length);

      if (hits === 0) return null;

      return {
        id: `theme-${paper.id}-${theme.replace(/\s+/g, "-")}`,
        paper_id: paper.id,
        theme,
        confidence,
      } satisfies PaperTheme;
    })
    .filter((item): item is PaperTheme => Boolean(item))
    .sort((a, b) => b.confidence - a.confidence);

  if (themes.length > 0) return themes;

  return [
    {
      id: `theme-${paper.id}-sin-clasificar`,
      paper_id: paper.id,
      theme: "sin clasificar",
      confidence: 0.3,
    },
  ];
}
