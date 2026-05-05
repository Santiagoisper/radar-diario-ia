import type { Source } from "../../domain/models";

export const sourcesSeed: Source[] = [
  {
    id: "source-arxiv-cs-ai",
    name: "arXiv cs.AI",
    type: "arxiv_category",
    url: "https://arxiv.org/list/cs.AI/recent",
    active: true,
    frequency: "daily",
    config_json: { category: "cs.AI" },
    last_run_at: "2026-05-05T08:00:00Z",
  },
];
