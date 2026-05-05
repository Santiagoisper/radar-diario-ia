export const themeKeywordsSeed: Record<string, string[]> = {
  agentes: ["agent", "multi-agent", "orchestration", "tool use", "planning", "terminal agent", "GUI agent"],
  memoria: ["memory", "long-term memory", "recall", "schema-grounded memory", "evolving memory"],
  "seguridad/alineación": ["safety", "alignment", "oversight", "control", "governance", "robust", "risk"],
  evaluación: ["benchmark", "evaluation", "leaderboard", "testbed", "world model", "reliability"],
  reasoning: ["reasoning"],
  multimodal: ["multimodal"],
  RL: ["reinforcement learning", "RL"],
  arquitectura: ["architecture", "design"],
  eficiencia: ["efficiency", "latency", "throughput"],
  tooling: ["tool", "framework", "stack"],
};

export const scoringWeightsSeed = {
  novelty_weight: 0.3,
  authority_weight: 0.2,
  relevance_weight: 0.25,
  concept_weight: 0.15,
  personal_weight: 0.1,
};
