export type SourceType = "arxiv_category" | "arxiv_author" | "rss" | "url";
export type SourceFrequency = "daily" | "hourly" | "weekly";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  active: boolean;
  frequency: SourceFrequency;
  config_json: Record<string, unknown>;
  last_run_at: string | null;
}
