import {
  authorWatchSeed,
  papersSeed,
  paperScoresSeed,
  paperThemesSeed,
} from "../../../data/seeds";

interface AuthorLinkedPaper {
  id: string;
  title: string;
  date: string;
  mainTheme: string;
  totalScore: number;
  detailPath: string;
}

interface AuthorTopicCount {
  theme: string;
  count: number;
}

export interface AuthorListItem {
  id: string;
  displayName: string;
  aliases: string[];
  priority: number;
  active: boolean;
  notes: string;
  lastAppearance: string | null;
  linkedPapersCount: number;
  topThemes: AuthorTopicCount[];
}

export interface AuthorDetail extends AuthorListItem {
  papers: AuthorLinkedPaper[];
  focusSignal: string;
  currentMainTheme: string;
}

function matchAuthor(paperAuthor: string, displayName: string, aliases: string[]): boolean {
  return paperAuthor === displayName || aliases.includes(paperAuthor);
}

function getPaperMainTheme(paperId: string): string {
  return (
    paperThemesSeed
      .filter((theme) => theme.paper_id === paperId)
      .sort((a, b) => b.confidence - a.confidence)[0]?.theme ?? "sin clasificar"
  );
}

function getPaperScore(paperId: string): number {
  return paperScoresSeed.find((score) => score.paper_id === paperId)?.total_score ?? 0;
}

function formatDateISO(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function getAuthorPapers(displayName: string, aliases: string[]): AuthorLinkedPaper[] {
  return papersSeed
    .filter((paper) =>
      paper.authors.some((author) => matchAuthor(author, displayName, aliases)),
    )
    .map((paper) => ({
      id: paper.id,
      title: paper.title,
      date: paper.published_at,
      mainTheme: getPaperMainTheme(paper.id),
      totalScore: getPaperScore(paper.id),
      detailPath: `/papers?paperId=${paper.id}`,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getTopThemes(papers: AuthorLinkedPaper[]): AuthorTopicCount[] {
  const byTheme = new Map<string, number>();

  papers.forEach((paper) => {
    byTheme.set(paper.mainTheme, (byTheme.get(paper.mainTheme) ?? 0) + 1);
  });

  return [...byTheme.entries()]
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function detectFocusSignal(papers: AuthorLinkedPaper[], topThemes: AuthorTopicCount[]): string {
  if (papers.length === 0) {
    return "Sin actividad reciente en el dataset mock para inferir foco conceptual.";
  }

  const dominant = topThemes[0]?.theme ?? "sin señal";
  const recentThemes = papers.slice(0, 2).map((paper) => paper.mainTheme);
  const olderThemes = papers.slice(2).map((paper) => paper.mainTheme);

  const recentDominant = recentThemes[0] ?? dominant;
  const olderDominant = olderThemes[0] ?? dominant;

  if (papers.length >= 3 && recentDominant !== olderDominant) {
    return `Se observa un posible cambio de foco desde ${olderDominant} hacia ${recentDominant}, con continuidad parcial en ${dominant}.`;
  }

  return `Predomina continuidad temática en ${dominant}, con variaciones tácticas en papers recientes.`;
}

export function buildAuthorsListView(): AuthorListItem[] {
  return authorWatchSeed
    .map((author) => {
      const papers = getAuthorPapers(author.display_name, author.aliases);
      const lastAppearance = papers[0]?.date ?? null;
      const topThemes = getTopThemes(papers);

      return {
        id: author.id,
        displayName: author.display_name,
        aliases: author.aliases,
        priority: author.priority,
        active: author.active,
        notes: author.notes,
        lastAppearance,
        linkedPapersCount: papers.length,
        topThemes,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function buildAuthorDetail(authorId: string): AuthorDetail | null {
  const author = authorWatchSeed.find((item) => item.id === authorId);
  if (!author) return null;

  const papers = getAuthorPapers(author.display_name, author.aliases);
  const topThemes = getTopThemes(papers);
  const focusSignal = detectFocusSignal(papers, topThemes);

  return {
    id: author.id,
    displayName: author.display_name,
    aliases: author.aliases,
    priority: author.priority,
    active: author.active,
    notes: author.notes,
    lastAppearance: papers[0]?.date ?? null,
    linkedPapersCount: papers.length,
    topThemes,
    papers,
    focusSignal,
    currentMainTheme: topThemes[0]?.theme ?? "sin señal",
  };
}

export function getAuthorsActivityToday() {
  const todayAuthors = buildAuthorsListView().filter((author) =>
    author.lastAppearance ? formatDateISO(author.lastAppearance) === "2026-05-05" : false,
  );

  return {
    activeTodayCount: todayAuthors.length,
    activeTodayIds: new Set(todayAuthors.map((author) => author.id)),
  };
}

export function formatAppearanceDate(dateIso: string | null): string {
  if (!dateIso) return "Sin apariciones";
  return formatDateISO(dateIso);
}
