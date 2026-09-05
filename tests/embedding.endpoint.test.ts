import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

describe("POST /v1/resume/embed", () => {
  const originalApiKey = process.env.MISTRAL_API_KEY;
  const originalModel = process.env.MISTRAL_EMBED_MODEL;
  const originalDimension = process.env.EMBEDDING_DIMENSION;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.MISTRAL_API_KEY;
    } else {
      process.env.MISTRAL_API_KEY = originalApiKey;
    }

    if (originalModel === undefined) {
      delete process.env.MISTRAL_EMBED_MODEL;
    } else {
      process.env.MISTRAL_EMBED_MODEL = originalModel;
    }

    if (originalDimension === undefined) {
      delete process.env.EMBEDDING_DIMENSION;
    } else {
      process.env.EMBEDDING_DIMENSION = originalDimension;
    }

    jest.restoreAllMocks();
  });

  it("returns a generated embedding for a resume payload", async () => {
    process.env.MISTRAL_API_KEY = "test-key";
    process.env.MISTRAL_EMBED_MODEL = "mistral-embed";
    process.env.EMBEDDING_DIMENSION = "1024";

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array.from({ length: 1024 }, (_, index) => (index % 3) / 1000) }],
      }),
    });

    jest.spyOn(globalThis, "fetch" as never).mockImplementation(fetchMock as never);

    const response = await request(app)
      .post("/v1/resume/embed")
      .send({
        name: "Rajesh Mohan Kumar",
        role: "Test Architect & Senior Agentic Test Engineer",
        skills: ["RAG", "DeepEval", "MCP (Model Context Protocol)"],
        company: "Testleaf Software Solutions Private Limited",
        experienceSummary: "Enterprise QA architecture and AI testing experience",
        rawText: "Rajesh Mohan Kumar ... full resume text here",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.model).toBe("mistral-embed");
    expect(response.body.dimension).toBe(1024);
    expect(response.body.embedding).toHaveLength(1024);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("https://api.mistral.ai/v1/embeddings");
  });
});
