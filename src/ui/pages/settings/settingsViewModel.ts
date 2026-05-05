import { authorWatchSeed, scoringWeightsSeed, sourcesSeed, themeKeywordsSeed, workflowScheduleSeed } from "../../../data/seeds";
import type { AuthorWatch, Source } from "../../../domain/models";

export interface ScoringWeights {
  novelty_weight: number;
  authority_weight: number;
  relevance_weight: number;
  concept_weight: number;
  personal_weight: number;
}

export interface WorkflowSchedule {
  ingestionWindow: string;
  scoringWindow: string;
  briefingWindow: string;
  dashboardAvailableAt: string;
}

export interface RadarSettingsState {
  sources: Source[];
  authors: AuthorWatch[];
  keywordsByTheme: Record<string, string[]>;
  weights: ScoringWeights;
  workflow: WorkflowSchedule;
}

export function buildDefaultSettingsState(): RadarSettingsState {
  return {
    sources: sourcesSeed.map((source) => ({ ...source })),
    authors: authorWatchSeed.map((author) => ({ ...author, aliases: [...author.aliases] })),
    keywordsByTheme: Object.fromEntries(
      Object.entries(themeKeywordsSeed).map(([theme, keywords]) => [theme, [...keywords]]),
    ),
    weights: { ...scoringWeightsSeed },
    workflow: { ...workflowScheduleSeed },
  };
}

export function validateWeightsSum(weights: ScoringWeights) {
  const sum =
    weights.novelty_weight +
    weights.authority_weight +
    weights.relevance_weight +
    weights.concept_weight +
    weights.personal_weight;

  const rounded = Number(sum.toFixed(4));
  const isValid = Math.abs(rounded - 1) < 0.0001;

  return {
    sum: rounded,
    isValid,
    message: isValid
      ? "La suma de pesos es correcta (1.00)."
      : "La suma de pesos debe ser 1.00 para mantener consistencia del score total.",
  };
}

export function toggleSourceActive(sources: Source[], sourceId: string): Source[] {
  return sources.map((source) =>
    source.id === sourceId ? { ...source, active: !source.active } : source,
  );
}

export function updateSourceFrequency(
  sources: Source[],
  sourceId: string,
  frequency: Source["frequency"],
): Source[] {
  return sources.map((source) =>
    source.id === sourceId ? { ...source, frequency } : source,
  );
}

export function updateAuthorField(
  authors: AuthorWatch[],
  authorId: string,
  patch: Partial<AuthorWatch>,
): AuthorWatch[] {
  return authors.map((author) =>
    author.id === authorId ? { ...author, ...patch } : author,
  );
}

export function addThemeKeyword(
  keywordsByTheme: Record<string, string[]>,
  theme: string,
  keyword: string,
): Record<string, string[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return keywordsByTheme;

  const current = keywordsByTheme[theme] ?? [];
  if (current.includes(trimmed)) return keywordsByTheme;

  return {
    ...keywordsByTheme,
    [theme]: [...current, trimmed],
  };
}

export function removeThemeKeyword(
  keywordsByTheme: Record<string, string[]>,
  theme: string,
  keyword: string,
): Record<string, string[]> {
  return {
    ...keywordsByTheme,
    [theme]: (keywordsByTheme[theme] ?? []).filter((item) => item !== keyword),
  };
}

export function updateWeight(
  weights: ScoringWeights,
  field: keyof ScoringWeights,
  value: number,
): ScoringWeights {
  return {
    ...weights,
    [field]: Number.isFinite(value) ? value : 0,
  };
}

export function scoringWeightMeta() {
  return [
    { key: "novelty_weight", label: "novelty_score", description: "Peso de novedad conceptual respecto de líneas previas." },
    { key: "authority_weight", label: "authority_score", description: "Peso de autoridad técnica de autores y señales de credibilidad." },
    { key: "relevance_weight", label: "relevance_score", description: "Peso de relevancia para agenda estratégica actual." },
    { key: "concept_weight", label: "concept_score", description: "Peso de densidad conceptual y potencial de conexión." },
    { key: "personal_weight", label: "personal_score", description: "Peso de ajuste a foco personal del usuario." },
  ] as const;
}
