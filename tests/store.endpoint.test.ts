import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

const insertOneMock = jest.fn();

jest.mock("../src/config/database", () => ({
  getResumesCollection: () => ({
    insertOne: insertOneMock,
  }),
}));

describe("POST /v1/resume/store", () => {
  beforeEach(() => {
    insertOneMock.mockReset();
  });

  it("stores a resume document and returns the inserted id", async () => {
    const insertedId = { toString: () => "691db80aa895776f97b6eca6" };
    insertOneMock.mockResolvedValue({ insertedId });

    const response = await request(app)
      .post("/v1/resume/store")
      .send({
        fileName: "Rajesh Mohan Kumar_Test Architect & Senior Agentic Test Engineer.pdf",
        resume: {
          name: "Rajesh Mohan Kumar",
          role: "Test Architect & Senior Agentic Test Engineer",
          skills: ["RAG", "DeepEval", "MCP (Model Context Protocol)"],
        },
        rawText: "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer",
        embedding: [0.01, -0.03, 0.004],
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Resume stored successfully");
    expect(response.body.resumeId).toBe("691db80aa895776f97b6eca6");
    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "Rajesh Mohan Kumar_Test Architect & Senior Agentic Test Engineer.pdf",
        rawText: expect.any(String),
        name: "Rajesh Mohan Kumar",
        role: "Test Architect & Senior Agentic Test Engineer",
        skills: expect.arrayContaining(["RAG", "DeepEval", "MCP (Model Context Protocol)"]),
        embedding: [0.01, -0.03, 0.004],
        embeddingModel: "mistral-embed",
        embeddingDimension: 1024,
      }),
    );
  });
});
