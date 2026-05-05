import type {
  AuthorWatch,
  DailyBriefing,
  DailyBriefingItem,
  Paper,
  PaperScore,
  PaperTheme,
} from "../../models";
import type { BriefingBuildResult } from "./types";

interface RankedPaper {
  paper: Paper;
  score: PaperScore;
  mainTheme: string;
  inclusionReason: string;
}

function getThemeForPaper(paperId: string, themes: PaperTheme[]): string {
  return (
    themes
      .filter((theme) => theme.paper_id === paperId)
      .sort((a, b) => b.confidence - a.confidence)[0]?.theme ?? "sin clasificar"
  );
}

function rankTopPapers(
  papers: Paper[],
  scores: PaperScore[],
  themes: PaperTheme[],
  topN: number,
): RankedPaper[] {
  return papers
    .map((paper) => {
      const score = scores.find((item) => item.paper_id === paper.id);
      if (!score) return null;

      const mainTheme = getThemeForPaper(paper.id, themes);
      return {
        paper,
        score,
        mainTheme,
        inclusionReason: `${mainTheme} con score total ${score.total_score.toFixed(2)} y señal aplicable.`,
      } satisfies RankedPaper;
    })
    .filter((item): item is RankedPaper => Boolean(item))
    .sort((a, b) => b.score.total_score - a.score.total_score)
    .slice(0, topN);
}

function summarizeTopThemes(ranked: RankedPaper[]): string[] {
  const count = new Map<string, number>();
  ranked.forEach((item) => {
    count.set(item.mainTheme, (count.get(item.mainTheme) ?? 0) + 1);
  });

  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme)
    .slice(0, 7);
}

function buildDirectionalView(topics: string[], topPapers: RankedPaper[]): string {
  const first = topics[0] ?? "investigación aplicada";
  const second = topics[1] ?? first;
  const avgScore =
    topPapers.reduce((acc, item) => acc + item.score.total_score, 0) /
    Math.max(topPapers.length, 1);

  return `Se observa convergencia entre ${first} y ${second}, con una señal de ejecución creciente en papers de score promedio ${avgScore.toFixed(2)}.`;
}

function buildConnections(
  topPapers: RankedPaper[],
  watchAuthors: AuthorWatch[],
  topics: string[],
): string {
  const trackedNames = new Set<string>();
  watchAuthors.forEach((author) => {
    trackedNames.add(author.display_name);
    author.aliases.forEach((alias) => trackedNames.add(alias));
  });

  const appearingTracked = Array.from(
    new Set(
      topPapers
        .flatMap((item) => item.paper.authors)
        .filter((author) => trackedNames.has(author)),
    ),
  );

  const trackedChunk =
    appearingTracked.length > 0
      ? `Autores observados presentes: ${appearingTracked.join(", ")}.`
      : "No aparecen autores observados en el top de hoy.";

  return `${trackedChunk} Las líneas ${topics.slice(0, 3).join(", ")} se conectan por foco en robustez operativa y trazabilidad de decisiones.`;
}

function buildPracticalValue(topics: string[]): string {
  const top = topics[0] ?? "prioridades técnicas";
  return `Útil para priorizar decisiones de producto y arquitectura en torno a ${top}, con seguimiento de avance real del campo en ciclos diarios.`;
}

function buildMarkdown(
  title: string,
  topics: string[],
  directionalView: string,
  connections: string,
  topPapers: RankedPaper[],
  practicalValue: string,
): string {
  const topicsBlock = topics.map((topic) => `- ${topic}`).join("\n");

  const tableHeader = "| Paper | Autor(es) | Tema | Por qué importa |";
  const tableDivider = "|---|---|---|---|";
  const tableRows = topPapers
    .map(
      (item) =>
        `| ${item.paper.title} | ${item.paper.authors.join(", ")} | ${item.mainTheme} | ${item.inclusionReason} |`,
    )
    .join("\n");

  return `# ${title}\n\n` +
    `## Temas relevantes\n${topicsBlock}\n\n` +
    `## Hacia dónde apunta la idea\n${directionalView}\n\n` +
    `## Cómo se conectan las ideas\n${connections}\n\n` +
    `## Papers destacados\n${tableHeader}\n${tableDivider}\n${tableRows}\n\n` +
    `## Utilidad práctica\n${practicalValue}`;
}

/** Generador determinístico de briefing (sin LLM). */
export function generateDailyBriefing(params: {
  date: string;
  papers: Paper[];
  themes: PaperTheme[];
  scores: PaperScore[];
  watchAuthors: AuthorWatch[];
  topN: number;
}): BriefingBuildResult {
  const topPapers = rankTopPapers(params.papers, params.scores, params.themes, params.topN);
  const relevantTopics = summarizeTopThemes(topPapers);
  const directionalView = buildDirectionalView(relevantTopics, topPapers);
  const conceptualConnections = buildConnections(topPapers, params.watchAuthors, relevantTopics);
  const practicalValue = buildPracticalValue(relevantTopics);

  const title = `Radar Diario de IA — ${params.date}`;
  const generated_markdown = buildMarkdown(
    title,
    relevantTopics,
    directionalView,
    conceptualConnections,
    topPapers,
    practicalValue,
  );

  const briefing: DailyBriefing = {
    id: `brief-${params.date}`,
    briefing_date: params.date,
    title,
    executive_summary:
      `Señal central: ${relevantTopics.slice(0, 3).join(", ")} lideran el recorte diario con foco práctico.`,
    relevant_topics: relevantTopics,
    directional_view: directionalView,
    conceptual_connections: conceptualConnections,
    practical_value: practicalValue,
    generated_markdown,
  };

  const briefingItems: DailyBriefingItem[] = topPapers.map((item, index) => ({
    id: `brief-item-${params.date}-${index + 1}`,
    briefing_id: briefing.id,
    paper_id: item.paper.id,
    rank: index + 1,
    inclusion_reason: item.inclusionReason,
  }));

  return { briefing, briefingItems };
}
