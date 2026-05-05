export interface DailyBriefing {
  id: string;
  briefing_date: string;
  title: string;
  executive_summary: string;
  relevant_topics: string[];
  directional_view: string;
  conceptual_connections: string;
  practical_value: string;
  generated_markdown: string;
}
