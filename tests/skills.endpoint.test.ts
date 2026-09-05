import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

describe("POST /v1/resume/skills", () => {
  it("returns detected skills from resume text", async () => {
    const response = await request(app)
      .post("/v1/resume/skills")
      .send({
        rawText:
          "Experienced in Selenium WebDriver, Python, RAG, DeepEval and MCP (Model Context Protocol).",
      })
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      skills: [
        "Selenium",
        "Python",
        "RAG",
        "DeepEval",
        "MCP (Model Context Protocol)",
      ],
    });
  });
});
