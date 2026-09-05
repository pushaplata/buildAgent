import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { ResumeParserService } from "../src/modules/ingestion/services/ResumeParserService";
import { ResumeIngestionRepository } from "../src/modules/ingestion/repositories/ResumeIngestionRepository";

describe("POST /v1/resume/ingest", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("orchestrates the full ingestion flow and returns a summary payload", async () => {
    jest.spyOn(ResumeParserService.prototype, "extractTextFromPdf").mockResolvedValue(`
Rajesh Mohan Kumar
Test Architect & Senior Agentic Test Engineer
13+ years of experience
Testleaf Software Solutions Private Limited
B.Tech - Information Technology
Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)
    `);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array.from({ length: 1024 }, (_, index) => (index % 2) / 1000) }],
      }),
    });
    jest.spyOn(globalThis, "fetch" as never).mockImplementation(fetchMock as never);

    jest.spyOn(ResumeIngestionRepository.prototype, "storeResume").mockResolvedValue("691db80aa895776f97b6eca6");

    const response = await request(app)
      .post("/v1/resume/ingest")
      .attach("file", Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"), "resume.pdf")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Resume ingestion completed");
    expect(response.body.resumeId).toBe("691db80aa895776f97b6eca6");
    expect(response.body.data).toMatchObject({
      name: "Rajesh Mohan Kumar",
      role: "Test Architect & Senior Agentic Test Engineer",
      company: "Testleaf Software Solutions Private Limited",
      totalExperience: 13,
      embeddingModel: "mistral-embed",
      embeddingDimension: 1024,
    });
    expect(response.body.timings).toMatchObject({
      extractMs: expect.any(Number),
      cleanMs: expect.any(Number),
      parseMs: expect.any(Number),
      embeddingMs: expect.any(Number),
      mongoInsertMs: expect.any(Number),
      totalMs: expect.any(Number),
    });
  });

  it("logs request metadata with timings while excluding sensitive content", async () => {
    jest.spyOn(ResumeParserService.prototype, "extractTextFromPdf").mockResolvedValue(`
Rajesh Mohan Kumar
Test Architect & Senior Agentic Test Engineer
13+ years of experience
Testleaf Software Solutions Private Limited
B.Tech - Information Technology
Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)
    `);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array.from({ length: 1024 }, (_, index) => (index % 2) / 1000) }],
      }),
    });
    jest.spyOn(globalThis, "fetch" as never).mockImplementation(fetchMock as never);

    jest.spyOn(ResumeIngestionRepository.prototype, "storeResume").mockResolvedValue("691db80aa895776f97b6eca6");

    const logSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);

    const response = await request(app)
      .post("/v1/resume/ingest")
      .attach("file", Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"), "resume.pdf")
      .expect(200);

    expect(response.headers["x-request-id"]).toBeDefined();

    const logged = logSpy.mock.calls
      .map(([message]) => (typeof message === "string" ? JSON.parse(message) : message))
      .find(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          entry.endpoint === "/v1/resume/ingest" &&
          entry.fileName === "resume.pdf",
      );

    expect(logged).toMatchObject({
      endpoint: "/v1/resume/ingest",
      fileName: "resume.pdf",
      statusCode: 200,
      extractMs: expect.any(Number),
      cleanMs: expect.any(Number),
      parseMs: expect.any(Number),
      embeddingMs: expect.any(Number),
      mongoInsertMs: expect.any(Number),
      totalMs: expect.any(Number),
    });

    expect(JSON.stringify(logged)).not.toContain("rawText");
    expect(JSON.stringify(logged)).not.toContain('"embedding":');
  });
});
