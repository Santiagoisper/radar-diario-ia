export interface Paper {
  id: string;
  external_id: string;
  source_id: string;
  title: string;
  abstract: string;
  authors: string[];
  published_at: string;
  updated_at: string;
  categories: string[];
  url: string;
  raw_payload: Record<string, unknown>;
  is_new_today: boolean;
}
