import {
  paperScoresSeed,
  papersSeed,
  paperThemesSeed,
} from "../../../data/seeds";
import type { PaperScore, PaperTheme } from "../../../domain/models";

export type PapersSort = "score_desc" | "date_desc" | "title_asc" | "author_asc";

export interface PapersFilters {
  datePreset: "all" | "today" | "last7";
  author: string;
  theme: string;
  category: string;
  scoreMin: number;
  onlyNewToday: boolean;
  sortBy: PapersSort;
}

export interface PaperListItem {
  id: string;
  title: string;
  authors: string[];
  publishedAt: string;
  categories: string[];
  mainTheme: string;
  totalScore: number;
  isNewToday: boolean;
}

export interface PaperDetail extends PaperListItem {
  abstract: string;
  updatedAt: string;
  themes: PaperTheme[];
  score: PaperScore | null;
  scoreExplanation: string;
  url: string;
}

const emptyScore: PaperScore = {
  id: "",
  paper_id: "",
  novelty_score: 0,
  authority_score: 0,
  relevance_score: 0,
  concept_score: 0,
  personal_score: 0,
  total_score: 0,
  explanation: "Sin explicación de score.",
};

function getMainTheme(paperId: string): string {
  return (
    paperThemesSeed
      .filter((theme) => theme.paper_id === paperId)
      .sort((a, b) => b.confidence - a.confidence)[0]?.theme ?? "sin clasificar"
  );
}

function getScore(paperId: string): PaperScore {
  return paperScoresSeed.find((score) => score.paper_id === paperId) ?? { ...emptyScore, paper_id: paperId };
}

export function buildPaperList(): PaperListItem[] {
  return papersSeed.map((paper) => {
    const score = getScore(paper.id);

    return {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      publishedAt: paper.published_at,
      categories: paper.categories,
      mainTheme: getMainTheme(paper.id),
      totalScore: score.total_score,
      isNewToday: paper.is_new_today,
    };
  });
}

export function buildFilterOptions() {
  const authors = Array.from(new Set(papersSeed.flatMap((paper) => paper.authors))).sort();
  const themes = Array.from(new Set(paperThemesSeed.map((theme) => theme.theme))).sort();
  const categories = Array.from(new Set(papersSeed.flatMap((paper) => paper.categories))).sort();

  return { authors, themes, categories };
}

export function applyPapersFilters(items: PaperListItem[], filters: PapersFilters): PaperListItem[] {
  const now = new Date("2026-05-05T23:59:59Z");
  const last7Start = new Date(now);
  last7Start.setUTCDate(now.getUTCDate() - 6);

  const filtered = items.filter((item) => {
    const publishedDate = new Date(item.publishedAt);

    if (filters.datePreset === "today" && !item.isNewToday) return false;
    if (filters.datePreset === "last7" && (publishedDate < last7Start || publishedDate > now)) return false;

    if (filters.author !== "all" && !item.authors.includes(filters.author)) return false;
    if (filters.theme !== "all" && item.mainTheme !== filters.theme) return false;
    if (filters.category !== "all" && !item.categories.includes(filters.category)) return false;
    if (item.totalScore < filters.scoreMin) return false;
    if (filters.onlyNewToday && !item.isNewToday) return false;

    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === "score_desc") return b.totalScore - a.totalScore;
    if (filters.sortBy === "date_desc") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (filters.sortBy === "title_asc") return a.title.localeCompare(b.title);

    const authorA = a.authors[0] ?? "";
    const authorB = b.authors[0] ?? "";
    return authorA.localeCompare(authorB);
  });
}

export function getPaperDetail(paperId: string): PaperDetail | null {
  const paper = papersSeed.find((item) => item.id === paperId);
  if (!paper) return null;

  const score = getScore(paperId);
  const themes = paperThemesSeed
    .filter((theme) => theme.paper_id === paperId)
    .sort((a, b) => b.confidence - a.confidence);

  return {
    id: paper.id,
    title: paper.title,
    authors: paper.authors,
    publishedAt: paper.published_at,
    updatedAt: paper.updated_at,
    categories: paper.categories,
    mainTheme: themes[0]?.theme ?? "sin clasificar",
    totalScore: score.total_score,
    isNewToday: paper.is_new_today,
    abstract: paper.abstract,
    themes,
    score,
    scoreExplanation: score.explanation,
    url: paper.url,
  };
}
