import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Paper } from "../../domain/models";

// Mock del módulo openai ANTES de importar enrichPapers
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  const MockOpenAI = vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  // Exponer mockCreate para acceder desde los tests
  (MockOpenAI as unknown as { _mockCreate: typeof mockCreate })._mockCreate = mockCreate;
  return { default: MockOpenAI };
});

function makePaper(id: string): Paper {
  return {
    id,
    external_id: `arxiv:2401.0000${id}`,
    source_id: "src-ai",
    title: `Paper sobre LLMs ${id}`,
    abstract: `Este paper presenta un método novedoso para mejorar el razonamiento en modelos de lenguaje grandes mediante técnicas de chain-of-thought estructurado. Los experimentos muestran mejoras del 15% en benchmarks estándar.`,
    authors: ["Alice Researcher", "Bob Smith"],
    published_at: "2024-01-15T12:00:00Z",
    updated_at: "2024-01-15T12:00:00Z",
    categories: ["cs.AI"],
    url: `https://arxiv.org/abs/2401.0000${id}`,
    raw_payload: {},
    is_new_today: true,
  };
}

const validLLMResponse = JSON.stringify({
  summary_es: "Propone un método de razonamiento estructurado para LLMs con mejoras medibles en benchmarks.",
  semantic_tags: ["chain-of-thought", "razonamiento", "LLMs", "benchmarks"],
  novelty_signal: "notable",
});

describe("enrichPapers", () => {
  const originalEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalEnv;
    }
  });

  it("retorna [] sin lanzar cuando OPENAI_API_KEY no está configurada", async () => {
    delete process.env.OPENAI_API_KEY;
    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1")]);
    expect(result).toHaveLength(0);
  });

  it("retorna [] para lista vacía de papers", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([]);
    expect(result).toHaveLength(0);
  });

  it("parsea correctamente una respuesta LLM válida", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const OpenAI = (await import("openai")).default as unknown as {
      _mockCreate: ReturnType<typeof vi.fn>;
      new (...args: unknown[]): unknown;
    };
    OpenAI._mockCreate.mockResolvedValue({
      choices: [{ message: { content: validLLMResponse } }],
    });

    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1")]);

    expect(result).toHaveLength(1);
    expect(result[0].paper_id).toBe("1");
    expect(result[0].summary_es).toContain("razonamiento");
    expect(result[0].semantic_tags).toContain("chain-of-thought");
    expect(result[0].novelty_signal).toBe("notable");
  });

  it("omite paper con respuesta LLM inválida y continúa con el resto", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const OpenAI = (await import("openai")).default as unknown as {
      _mockCreate: ReturnType<typeof vi.fn>;
      new (...args: unknown[]): unknown;
    };
    OpenAI._mockCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: "esto no es json" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: validLLMResponse } }] });

    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1"), makePaper("2")]);

    // Solo el segundo paper tiene respuesta válida
    expect(result).toHaveLength(1);
    expect(result[0].paper_id).toBe("2");
  });

  it("omite paper cuando el LLM lanza error y continúa con el resto", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const OpenAI = (await import("openai")).default as unknown as {
      _mockCreate: ReturnType<typeof vi.fn>;
      new (...args: unknown[]): unknown;
    };
    OpenAI._mockCreate
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValueOnce({ choices: [{ message: { content: validLLMResponse } }] });

    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1"), makePaper("2")]);

    expect(result).toHaveLength(1);
    expect(result[0].paper_id).toBe("2");
  });

  it("acepta respuesta LLM envuelta en markdown code block", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const OpenAI = (await import("openai")).default as unknown as {
      _mockCreate: ReturnType<typeof vi.fn>;
      new (...args: unknown[]): unknown;
    };
    const wrapped = "```json\n" + validLLMResponse + "\n```";
    OpenAI._mockCreate.mockResolvedValue({
      choices: [{ message: { content: wrapped } }],
    });

    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1")]);

    expect(result).toHaveLength(1);
    expect(result[0].novelty_signal).toBe("notable");
  });

  it("normaliza novelty_signal inválido a 'incremental'", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    const OpenAI = (await import("openai")).default as unknown as {
      _mockCreate: ReturnType<typeof vi.fn>;
      new (...args: unknown[]): unknown;
    };
    const badSignal = JSON.stringify({
      summary_es: "Resumen válido del paper.",
      semantic_tags: ["tag1"],
      novelty_signal: "revolutionary", // inválido
    });
    OpenAI._mockCreate.mockResolvedValue({
      choices: [{ message: { content: badSignal } }],
    });

    const { enrichPapers } = await import("./enrichPapers");
    const result = await enrichPapers([makePaper("1")]);

    expect(result).toHaveLength(1);
    expect(result[0].novelty_signal).toBe("incremental");
  });
});
