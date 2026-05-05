import {
  papersSeed,
  paperThemesSeed,
  paperScoresSeed,
  trendSnapshotsSeed,
} from "../../../data/seeds";

export type TrendsPeriod = "7d" | "30d" | "all";

export interface TrendsFilters {
  period: TrendsPeriod;
  theme: string;
  author: string;
  category: string;
}

interface BasePaperRow {
  id: string;
  title: string;
  date: string;
  authors: string[];
  categories: string[];
  theme: string;
  score: number;
}

export interface TrendsSummary {
  selectedPeriodLabel: string;
  dominantTheme: string;
  fastestGrowingTheme: string;
  mostRecurrentAuthor: string;
  totalPapers: number;
  conceptualReading: string;
}

export interface ThemeGrowthItem {
  theme: string;
  currentCount: number;
  previousCount: number;
  delta: number;
  importanceNote: string;
}

export interface RecurrentAuthorItem {
  author: string;
  appearances: number;
  associatedThemes: string[];
  highlightedPapers: string[];
}

export interface ConceptLineItem {
  theme: string;
  frequency: number;
  papers: string[];
  authors: string[];
  interpretation: string;
}

export interface BarDatum {
  label: string;
  value: number;
  delta?: number;
}

export interface TrendsViewModel {
  summary: TrendsSummary;
  growthThemes: ThemeGrowthItem[];
  recurrentAuthors: RecurrentAuthorItem[];
  conceptLines: ConceptLineItem[];
  themeBars: BarDatum[];
  authorBars: BarDatum[];
  categoryBars: BarDatum[];
  evolutionBars: BarDatum[];
}

function getMainTheme(paperId: string): string {
  return (
    paperThemesSeed
      .filter((theme) => theme.paper_id === paperId)
      .sort((a, b) => b.confidence - a.confidence)[0]?.theme ?? "sin clasificar"
  );
}

function getScore(paperId: string): number {
  return paperScoresSeed.find((score) => score.paper_id === paperId)?.total_score ?? 0;
}

function getReferenceDate(): Date {
  const maxDate = papersSeed
    .map((paper) => new Date(paper.published_at).getTime())
    .sort((a, b) => b - a)[0];

  return Number.isFinite(maxDate) ? new Date(maxDate) : new Date();
}

function getPeriodWindow(period: TrendsPeriod, end: Date) {
  if (period === "all") {
    return { start: new Date("1970-01-01T00:00:00Z"), end };
  }

  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (period === "7d" ? 6 : 29));
  return { start, end };
}

function getPreviousWindow(period: TrendsPeriod, currentStart: Date, currentEnd: Date) {
  if (period === "all") {
    return null;
  }

  const diffMs = currentEnd.getTime() - currentStart.getTime();
  const prevEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
  const prevStart = new Date(prevEnd.getTime() - diffMs);
  return { start: prevStart, end: prevEnd };
}

function isWithin(dateIso: string, start: Date, end: Date): boolean {
  const date = new Date(dateIso);
  return date >= start && date <= end;
}

function buildPaperRows(): BasePaperRow[] {
  return papersSeed.map((paper) => ({
    id: paper.id,
    title: paper.title,
    date: paper.published_at,
    authors: paper.authors,
    categories: paper.categories,
    theme: getMainTheme(paper.id),
    score: getScore(paper.id),
  }));
}

function applyFilters(rows: BasePaperRow[], filters: TrendsFilters): BasePaperRow[] {
  const end = getReferenceDate();
  const { start, end: effectiveEnd } = getPeriodWindow(filters.period, end);

  return rows.filter((row) => {
    if (!isWithin(row.date, start, effectiveEnd)) return false;
    if (filters.theme !== "all" && row.theme !== filters.theme) return false;
    if (filters.author !== "all" && !row.authors.includes(filters.author)) return false;
    if (filters.category !== "all" && !row.categories.includes(filters.category)) return false;
    return true;
  });
}

function countByTheme(rows: BasePaperRow[]) {
  const count = new Map<string, number>();
  rows.forEach((row) => {
    count.set(row.theme, (count.get(row.theme) ?? 0) + 1);
  });
  return count;
}

function countByAuthor(rows: BasePaperRow[]) {
  const count = new Map<string, number>();
  rows.forEach((row) => {
    row.authors.forEach((author) => {
      count.set(author, (count.get(author) ?? 0) + 1);
    });
  });
  return count;
}

function countByCategory(rows: BasePaperRow[]) {
  const count = new Map<string, number>();
  rows.forEach((row) => {
    row.categories.forEach((category) => {
      count.set(category, (count.get(category) ?? 0) + 1);
    });
  });
  return count;
}

function toRankedBars(map: Map<string, number>, limit = 8): BarDatum[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function buildThemeGrowth(
  currentRows: BasePaperRow[],
  previousRows: BasePaperRow[],
): ThemeGrowthItem[] {
  const curr = countByTheme(currentRows);
  const prev = countByTheme(previousRows);
  const allThemes = new Set([...curr.keys(), ...prev.keys()]);

  return [...allThemes]
    .map((theme) => {
      const currentCount = curr.get(theme) ?? 0;
      const previousCount = prev.get(theme) ?? 0;
      const delta = currentCount - previousCount;

      return {
        theme,
        currentCount,
        previousCount,
        delta,
        importanceNote:
          delta > 0
            ? "Gana densidad y merece seguimiento prioritario."
            : delta < 0
              ? "Pierde tracción relativa, revisar si es ruido temporal."
              : "Se mantiene estable como línea de continuidad.",
      } satisfies ThemeGrowthItem;
    })
    .sort((a, b) => b.currentCount - a.currentCount || b.delta - a.delta)
    .slice(0, 8);
}

function buildRecurrentAuthors(rows: BasePaperRow[]): RecurrentAuthorItem[] {
  const byAuthor = new Map<string, BasePaperRow[]>();

  rows.forEach((row) => {
    row.authors.forEach((author) => {
      const current = byAuthor.get(author) ?? [];
      current.push(row);
      byAuthor.set(author, current);
    });
  });

  return [...byAuthor.entries()]
    .map(([author, papers]) => {
      const themeCount = new Map<string, number>();
      papers.forEach((paper) => {
        themeCount.set(paper.theme, (themeCount.get(paper.theme) ?? 0) + 1);
      });

      const associatedThemes = [...themeCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([theme]) => theme)
        .slice(0, 3);

      const highlightedPapers = [...papers]
        .sort((a, b) => b.score - a.score)
        .map((paper) => paper.title)
        .slice(0, 3);

      return {
        author,
        appearances: papers.length,
        associatedThemes,
        highlightedPapers,
      } satisfies RecurrentAuthorItem;
    })
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 8);
}

function buildConceptLines(rows: BasePaperRow[]): ConceptLineItem[] {
  const byTheme = new Map<string, BasePaperRow[]>();

  rows.forEach((row) => {
    const current = byTheme.get(row.theme) ?? [];
    current.push(row);
    byTheme.set(row.theme, current);
  });

  return [...byTheme.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5)
    .map(([theme, papers]) => {
      const authors = Array.from(new Set(papers.flatMap((paper) => paper.authors))).slice(0, 5);
      const paperTitles = papers
        .sort((a, b) => b.score - a.score)
        .map((paper) => paper.title)
        .slice(0, 4);

      return {
        theme,
        frequency: papers.length,
        papers: paperTitles,
        authors,
        interpretation:
          `La línea ${theme} muestra ${papers.length} apariciones en el período, consolidándose como señal de diseño y ejecución.`,
      } satisfies ConceptLineItem;
    });
}

function buildConceptualReading(dominantTheme: string, fastestGrowingTheme: string): string {
  const seedTrend = [...trendSnapshotsSeed]
    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0]?.trend_summary;

  if (seedTrend) {
    return `${seedTrend} En este recorte, ${dominantTheme} domina y ${fastestGrowingTheme} marca aceleración relativa.`;
  }

  return `El período muestra dominancia de ${dominantTheme} y aceleración en ${fastestGrowingTheme}, señalando una fase de convergencia aplicada.`;
}

function getEvolutionBars(filters: TrendsFilters): BarDatum[] {
  const rows = buildPaperRows();
  const ref = getReferenceDate();

  if (filters.period === "all") {
    const weekly = rows.filter((row) => isWithin(row.date, new Date(ref.getTime() - 6 * 86400000), ref)).length;
    const monthly = rows.filter((row) => isWithin(row.date, new Date(ref.getTime() - 29 * 86400000), ref)).length;

    return [
      { label: "Últimos 7 días", value: weekly },
      { label: "Últimos 30 días", value: monthly },
      { label: "Total histórico", value: rows.length },
    ];
  }

  const { start, end } = getPeriodWindow(filters.period, ref);
  const prev = getPreviousWindow(filters.period, start, end);
  const current = rows.filter((row) => isWithin(row.date, start, end)).length;
  const previous = prev ? rows.filter((row) => isWithin(row.date, prev.start, prev.end)).length : 0;

  return [
    { label: "Período actual", value: current },
    { label: "Período anterior", value: previous, delta: current - previous },
  ];
}

export function buildTrendsFilterOptions() {
  const rows = buildPaperRows();

  return {
    themes: Array.from(new Set(rows.map((row) => row.theme))).sort(),
    authors: Array.from(new Set(rows.flatMap((row) => row.authors))).sort(),
    categories: Array.from(new Set(rows.flatMap((row) => row.categories))).sort(),
  };
}

export function buildTrendsViewModel(filters: TrendsFilters): TrendsViewModel {
  const allRows = buildPaperRows();
  const filteredRows = applyFilters(allRows, filters);

  const referenceDate = getReferenceDate();
  const { start, end } = getPeriodWindow(filters.period, referenceDate);
  const prevWindow = getPreviousWindow(filters.period, start, end);

  const previousRows = prevWindow
    ? allRows.filter((row) => {
        if (!isWithin(row.date, prevWindow.start, prevWindow.end)) return false;
        if (filters.theme !== "all" && row.theme !== filters.theme) return false;
        if (filters.author !== "all" && !row.authors.includes(filters.author)) return false;
        if (filters.category !== "all" && !row.categories.includes(filters.category)) return false;
        return true;
      })
    : [];

  const themeBars = toRankedBars(countByTheme(filteredRows), 8);
  const authorBars = toRankedBars(countByAuthor(filteredRows), 8);
  const categoryBars = toRankedBars(countByCategory(filteredRows), 6);
  const growthThemes = buildThemeGrowth(filteredRows, previousRows);
  const recurrentAuthors = buildRecurrentAuthors(filteredRows);
  const conceptLines = buildConceptLines(filteredRows);

  const dominantTheme = themeBars[0]?.label ?? "sin señal";
  const fastestGrowingTheme =
    [...growthThemes].sort((a, b) => b.delta - a.delta)[0]?.theme ?? dominantTheme;
  const mostRecurrentAuthor = recurrentAuthors[0]?.author ?? "sin recurrencia";

  const periodLabel =
    filters.period === "7d"
      ? "Últimos 7 días"
      : filters.period === "30d"
        ? "Últimos 30 días"
        : "Histórico completo";

  return {
    summary: {
      selectedPeriodLabel: periodLabel,
      dominantTheme,
      fastestGrowingTheme,
      mostRecurrentAuthor,
      totalPapers: filteredRows.length,
      conceptualReading: buildConceptualReading(dominantTheme, fastestGrowingTheme),
    },
    growthThemes,
    recurrentAuthors,
    conceptLines,
    themeBars,
    authorBars,
    categoryBars,
    evolutionBars: getEvolutionBars(filters),
  };
}
