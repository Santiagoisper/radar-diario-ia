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
  {
    id: "source-arxiv-cs-lg",
    name: "arXiv cs.LG",
    type: "arxiv_category",
    url: "https://arxiv.org/list/cs.LG/recent",
    active: false,
    frequency: "daily",
    config_json: { category: "cs.LG" },
    last_run_at: null,
  },
  {
    id: "source-arxiv-cs-cl",
    name: "arXiv cs.CL",
    type: "arxiv_category",
    url: "https://arxiv.org/list/cs.CL/recent",
    active: false,
    frequency: "daily",
    config_json: { category: "cs.CL" },
    last_run_at: null,
  },
  {
    id: "source-arxiv-cs-ir",
    name: "arXiv cs.IR",
    type: "arxiv_category",
    url: "https://arxiv.org/list/cs.IR/recent",
    active: false,
    frequency: "daily",
    config_json: { category: "cs.IR" },
    last_run_at: null,
  },
];
