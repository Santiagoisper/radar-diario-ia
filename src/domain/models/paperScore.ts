export interface PaperScore {
  id: string;
  paper_id: string;
  novelty_score: number;
  authority_score: number;
  relevance_score: number;
  concept_score: number;
  personal_score: number;
  total_score: number;
  explanation: string;
}
