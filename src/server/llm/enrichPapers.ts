import OpenAI from "openai";
import type { Paper } from "../../domain/models";

/**
 * Resultado del enriquecimiento LLM por paper.
 * Todos los campos son opcionales: si el LLM falla o no está configurado,
 * el pipeline sigue funcionando sin enriquecimiento.
 */
export interface PaperEnrichment {
  paper_id: string;
  /** Resumen en español de 2-3 oraciones, orientado a impacto práctico. */
  summary_es: string;
  /** Etiquetas semánticas derivadas del abstract (máx. 5). */
  semantic_tags: string[];
  /** Nivel de novedad percibido: "incremental" | "notable" | "breakthrough" */
  novelty_signal: "incremental" | "notable" | "breakthrough";
}

interface LLMPaperResponse {
  summary_es: string;
  semantic_tags: string[];
  novelty_signal: "incremental" | "notable" | "breakthrough";
}

const SYSTEM_PROMPT = `Sos un analista de investigación en IA. Para cada paper que te pase, respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "summary_es": "string — resumen en español de 2-3 oraciones, enfocado en qué aporta y por qué importa en la práctica",
  "semantic_tags": ["tag1", "tag2", ...],
  "novelty_signal": "incremental" | "notable" | "breakthrough"
}

Reglas:
- summary_es: máximo 60 palabras, sin jerga innecesaria, sin repetir el título
- semantic_tags: entre 2 y 5 etiquetas cortas y específicas (ej: "fine-tuning", "razonamiento causal", "eficiencia computacional")
- novelty_signal: "incremental" si mejora algo existente, "notable" si introduce un enfoque diferente, "breakthrough" solo si cambia el paradigma
- No agregues texto fuera del JSON`;

function buildUserMessage(paper: Paper): string {
  const authorsStr = paper.authors.slice(0, 3).join(", ");
  const abstractTruncated = paper.abstract.slice(0, 800);
  return `Título: ${paper.title}\nAutores: ${authorsStr}\nAbstract: ${abstractTruncated}`;
}

function parseEnrichmentResponse(raw: string): LLMPaperResponse | null {
  try {
    // Extraer JSON aunque venga envuelto en markdown code blocks
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<LLMPaperResponse>;

    const validSignals = ["incremental", "notable", "breakthrough"] as const;
    const novelty = validSignals.includes(parsed.novelty_signal as (typeof validSignals)[number])
      ? (parsed.novelty_signal as (typeof validSignals)[number])
      : "incremental";

    return {
      summary_es: typeof parsed.summary_es === "string" ? parsed.summary_es.trim() : "",
      semantic_tags: Array.isArray(parsed.semantic_tags)
        ? parsed.semantic_tags.filter((t): t is string => typeof t === "string").slice(0, 5)
        : [],
      novelty_signal: novelty,
    };
  } catch {
    return null;
  }
}

/**
 * Enriquece un lote de papers con resúmenes y clasificación semántica via LLM.
 *
 * - Si OPENAI_API_KEY no está configurada, retorna [] sin lanzar.
 * - Procesa los papers en serie para respetar rate limits.
 * - Errores individuales se loguean y se omiten (no detienen el lote).
 * - Modelo configurable via OPENAI_ENRICHMENT_MODEL (default: gpt-4.1-mini).
 */
export async function enrichPapers(papers: Paper[]): Promise<PaperEnrichment[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[enrichPapers] OPENAI_API_KEY no configurada — enriquecimiento omitido");
    return [];
  }

  if (papers.length === 0) return [];

  const model = process.env.OPENAI_ENRICHMENT_MODEL ?? "gpt-4.1-mini";
  const client = new OpenAI({ apiKey });
  const results: PaperEnrichment[] = [];

  for (const paper of papers) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(paper) },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      const parsed = parseEnrichmentResponse(raw);

      if (!parsed || !parsed.summary_es) {
        console.warn(`[enrichPapers] respuesta inválida para paper ${paper.id} — omitido`);
        continue;
      }

      results.push({
        paper_id: paper.id,
        summary_es: parsed.summary_es,
        semantic_tags: parsed.semantic_tags,
        novelty_signal: parsed.novelty_signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[enrichPapers] error en paper ${paper.id}: ${msg}`);
      // No lanzamos: el pipeline sigue con los papers que sí se pudieron enriquecer
    }
  }

  return results;
}
