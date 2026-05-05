export type TrendPeriodType = "daily" | "weekly" | "monthly";

export interface TrendSnapshot {
  id: string;
  period_type: TrendPeriodType;
  period_start: string;
  period_end: string;
  top_themes: string[];
  recurring_authors: string[];
  trend_summary: string;
}
