import {
  dailyBriefingsSeed,
  dailyBriefingItemsSeed,
  papersSeed,
  paperScoresSeed,
  paperThemesSeed,
} from "../../../data/seeds";

export type ArchiveRange = "7d" | "30d" | "all";

export interface ArchiveFilters {
  dateQuery: string;
  theme: string;
  author: string;
  range: ArchiveRange;
}

export interface ArchiveListItem {
  id: string;
  date: string;
  title: string;
  executiveSummaryShort: string;
  papersCount: number;
  topThemes: string[];
  dominantSignal: string;
  authorsMentioned: string[];
}

export interface ArchiveHighlightedPaper {
  id: string;
  title: string;
  authors: string[];
  date: string;
  theme: string;
  totalScore: number;
  whyItMatters: string;
}

export interface ArchiveBriefingDetail {
  id: string;
  title: string;
  date: string;
  executiveSummary: string;
  relevantThemes: string[];
  directionalView: string;
  conceptualConnections: string;
  practicalValue: string;
  markdown: string;
  highlightedPapers: ArchiveHighlightedPaper[];
}

interface BriefingPaperRef {
  paperId: string;
  reason: string;
  rank: number;
}

function getBriefingPaperRefs(briefingId: string): BriefingPaperRef[] {
  return dailyBriefingItemsSeed
    .filter((item) => item.briefing_id === briefingId)
    .sort((a, b) => a.rank - b.rank)
    .map((item) => ({ paperId: item.paper_id, reason: item.inclusion_reason, rank: item.rank }));
}

function getPaperTheme(paperId: string): string {
  return (
    paperThemesSeed
      .filter((item) => item.paper_id === paperId)
      .sort((a, b) => b.confidence - a.confidence)[0]?.theme ?? "sin clasificar"
  );
}

function getPaperScore(paperId: string): number {
  return paperScoresSeed.find((item) => item.paper_id === paperId)?.total_score ?? 0;
}

function summarizeText(text: string, maxLen = 140): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

function normalizeDate(dateIsoOrDate: string): string {
  return dateIsoOrDate.slice(0, 10);
}

function isDateInRange(date: string, range: ArchiveRange): boolean {
  if (range === "all") return true;

  const end = new Date("2026-05-05T23:59:59Z");
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (range === "7d" ? 6 : 29));

  const value = new Date(`${date}T00:00:00Z`);
  return value >= start && value <= end;
}

function buildListItem(briefingId: string): ArchiveListItem | null {
  const briefing = dailyBriefingsSeed.find((item) => item.id === briefingId);
  if (!briefing) return null;

  const refs = getBriefingPaperRefs(briefingId);
  const papers = refs
    .map((ref) => papersSeed.find((paper) => paper.id === ref.paperId))
    .filter((paper): paper is NonNullable<typeof paper> => Boolean(paper));

  const themeCount = new Map<string, number>();
  papers.forEach((paper) => {
    const theme = getPaperTheme(paper.id);
    themeCount.set(theme, (themeCount.get(theme) ?? 0) + 1);
  });

  const topThemes = [...themeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme)
    .slice(0, 3);

  const dominantSignal = topThemes[0] ?? briefing.relevant_topics[0] ?? "sin señal";
  const authorsMentioned = Array.from(new Set(papers.flatMap((paper) => paper.authors))).slice(0, 6);

  return {
    id: briefing.id,
    date: briefing.briefing_date,
    title: briefing.title,
    executiveSummaryShort: summarizeText(briefing.executive_summary),
    papersCount: refs.length,
    topThemes: topThemes.length > 0 ? topThemes : briefing.relevant_topics.slice(0, 3),
    dominantSignal,
    authorsMentioned,
  };
}

export function buildArchiveFilterOptions() {
  const themes = Array.from(
    new Set(dailyBriefingsSeed.flatMap((briefing) => briefing.relevant_topics)),
  ).sort();

  const authorPool = new Set<string>();
  dailyBriefingsSeed.forEach((briefing) => {
    getBriefingPaperRefs(briefing.id).forEach((ref) => {
      const paper = papersSeed.find((item) => item.id === ref.paperId);
      paper?.authors.forEach((author) => authorPool.add(author));
    });
  });

  return {
    themes,
    authors: Array.from(authorPool).sort(),
  };
}

export function buildArchiveList(filters: ArchiveFilters): ArchiveListItem[] {
  return dailyBriefingsSeed
    .map((briefing) => buildListItem(briefing.id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => {
      if (!isDateInRange(item.date, filters.range)) return false;
      if (filters.dateQuery && !item.date.includes(filters.dateQuery)) return false;
      if (filters.theme !== "all" && !item.topThemes.includes(filters.theme)) return false;
      if (filters.author !== "all" && !item.authorsMentioned.includes(filters.author)) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function buildArchiveDetail(briefingId: string): ArchiveBriefingDetail | null {
  const briefing = dailyBriefingsSeed.find((item) => item.id === briefingId);
  if (!briefing) return null;

  const highlightedPapers = getBriefingPaperRefs(briefingId)
    .map((ref) => {
      const paper = papersSeed.find((item) => item.id === ref.paperId);
      if (!paper) return null;

      return {
        id: paper.id,
        title: paper.title,
        authors: paper.authors,
        date: normalizeDate(paper.published_at),
        theme: getPaperTheme(paper.id),
        totalScore: getPaperScore(paper.id),
        whyItMatters: ref.reason,
      } satisfies ArchiveHighlightedPaper;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    id: briefing.id,
    title: briefing.title,
    date: briefing.briefing_date,
    executiveSummary: briefing.executive_summary,
    relevantThemes: briefing.relevant_topics,
    directionalView: briefing.directional_view,
    conceptualConnections: briefing.conceptual_connections,
    practicalValue: briefing.practical_value,
    markdown: briefing.generated_markdown,
    highlightedPapers,
  };
}
