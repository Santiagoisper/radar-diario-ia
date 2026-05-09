import type {
  AuthorWatch,
  DailyBriefing,
  DailyBriefingItem,
  Paper,
  PaperScore,
  PaperTheme,
  Source,
  TrendPeriodType,
  TrendSnapshot,
} from "../../models";

export interface RadarScoringWeights {
  novelty_score: number;
  authority_score: number;
  relevance_score: number;
  concept_score: number;
  personal_score: number;
}

export interface RadarWorkflowConfig {
  sources: Source[];
  authors: AuthorWatch[];
  keywordsByTheme: Record<string, string[]>;
  scoringWeights: RadarScoringWeights;
  topN: number;
}

export interface IngestedPaperPayload {
  source_id: string;
  external_id: string;
  title: string;
  abstract: string;
  authors: string[];
  published_at: string;
  updated_at: string;
  categories: string[];
  url: string;
  raw_payload: Record<string, unknown>;
}

export interface BriefingBuildResult {
  briefing: DailyBriefing;
  briefingItems: DailyBriefingItem[];
}

export interface PaperEnrichmentResult {
  paper_id: string;
  summary_es: string;
  semantic_tags: string[];
  novelty_signal: "incremental" | "notable" | "breakthrough";
}

export interface RadarWorkflowResult {
  papers: Paper[];
  themes: PaperTheme[];
  scores: PaperScore[];
  briefing: DailyBriefing;
  briefingItems: DailyBriefingItem[];
  trendSnapshot: TrendSnapshot;
  /** Enriquecimiento LLM por paper. Vacío si OPENAI_API_KEY no está configurada. */
  enrichments: PaperEnrichmentResult[];
  logs: string[];
}

export interface TrendSnapshotInput {
  papers: Paper[];
  themes: PaperTheme[];
  scores: PaperScore[];
  briefings: DailyBriefing[];
  periodType: TrendPeriodType;
}
