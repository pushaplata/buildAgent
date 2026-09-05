import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

describe("POST /v1/resume/clean", () => {
  it("returns cleaned resume text", async () => {
    const response = await request(app)
      .post("/v1/resume/clean")
      .send({
        rawText:
          "Rajesh Mohan Kumar\n\n\nTest Architect & Senior Agentic Test Engineer   \n RAG",
      })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      cleanText:
        "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer\nRAG",
    });
  });
});
