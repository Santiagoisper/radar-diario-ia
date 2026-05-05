import type { AuthorWatch } from "../../domain/models";

export const authorWatchSeed: AuthorWatch[] = [
  { id: "aw-1", display_name: "Geoffrey Hinton", aliases: ["G. Hinton"], priority: 10, active: true, notes: "Foundational" },
  { id: "aw-2", display_name: "Yoshua Bengio", aliases: ["Y. Bengio"], priority: 10, active: true, notes: "Alignment + representation" },
  { id: "aw-3", display_name: "Yann LeCun", aliases: ["Y. LeCun"], priority: 9, active: true, notes: "Architecture" },
  { id: "aw-4", display_name: "Stuart Russell", aliases: ["S. Russell"], priority: 9, active: true, notes: "Safety" },
  { id: "aw-5", display_name: "Nick Bostrom", aliases: [], priority: 8, active: true, notes: "Strategy" },
  { id: "aw-6", display_name: "Roman Yampolskiy", aliases: [], priority: 7, active: true, notes: "AI risk" },
  { id: "aw-7", display_name: "Fei-Fei Li", aliases: ["F. Li"], priority: 9, active: true, notes: "Vision + multimodal" },
];
