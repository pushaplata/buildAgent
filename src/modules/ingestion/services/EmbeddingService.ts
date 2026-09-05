import { AppError } from "../../../middleware/appError";

export interface ResumeEmbeddingInput {
  name?: string;
  role?: string;
  skills?: string[];
  company?: string;
  experienceSummary?: string;
  rawText?: string;
}

export interface GeneratedEmbedding {
  model: string;
  dimension: number;
  embedding: number[];
}

export class EmbeddingService {
  static buildEmbeddingText(payload: ResumeEmbeddingInput): string {
    const parts = [
      payload.name,
      payload.role,
      Array.isArray(payload.skills) ? payload.skills.join(", ") : "",
      payload.company,
      payload.experienceSummary,
      payload.rawText,
    ];

    return parts
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("\n");
  }

  async generateEmbedding(payload: ResumeEmbeddingInput): Promise<GeneratedEmbedding> {
    const apiKey = process.env.MISTRAL_API_KEY?.trim();
    const model = process.env.MISTRAL_EMBED_MODEL ?? "mistral-embed";
    const expectedDimension = Number(process.env.EMBEDDING_DIMENSION ?? 1024);
    const embeddingText = EmbeddingService.buildEmbeddingText(payload);

    if (!apiKey || !embeddingText.trim()) {
      throw new AppError("EMBEDDING_FAILED", "Mistral embedding failed", 502);
    }

    try {
      const response = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: embeddingText,
          encoding_format: "float",
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral API returned ${response.status}`);
      }

      const result = (await response.json()) as {
        data?: Array<{ embedding?: number[] }>; 
      };

      const embedding = result.data?.[0]?.embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Mistral response missing embedding");
      }

      if (!Number.isInteger(expectedDimension) || expectedDimension <= 0) {
        throw new Error("Invalid embedding dimension");
      }

      if (embedding.length !== expectedDimension) {
        throw new Error("Embedding dimension mismatch");
      }

      return {
        model,
        dimension: embedding.length,
        embedding,
      };
    } catch (_error) {
      throw new AppError("EMBEDDING_FAILED", "Mistral embedding failed", 502);
    }
  }
}
