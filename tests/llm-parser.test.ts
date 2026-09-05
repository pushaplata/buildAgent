import { describe, expect, afterEach, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

const SAMPLE_RESUME = `
Rajesh Mohan Kumar
Test Architect & Senior Agentic Test Engineer
13+ years of experience
Testleaf Software Solutions Private Limited
B.Tech - Information Technology
Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)
`.trim();

describe("POST /v1/resume/llm-parse", () => {
  const originalFlag = process.env.USE_LLM_PARSER;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.USE_LLM_PARSER;
    } else {
      process.env.USE_LLM_PARSER = originalFlag;
    }
  });

  it("returns a disabled error when the LLM parser feature flag is off", async () => {
    process.env.USE_LLM_PARSER = "false";

    const response = await request(app)
      .post("/v1/resume/llm-parse")
      .send({ rawText: SAMPLE_RESUME })
      .expect(200);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "LLM_PARSER_DISABLED",
      message: "LLM resume parser is disabled",
    });
  });

  it("returns a parsed resume when the LLM parser feature flag is enabled", async () => {
    process.env.USE_LLM_PARSER = "true";

    const response = await request(app)
      .post("/v1/resume/llm-parse")
      .send({ rawText: SAMPLE_RESUME })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.resume).toMatchObject({
      name: "Rajesh Mohan Kumar",
      role: "Test Architect & Senior Agentic Test Engineer",
      company: "Testleaf Software Solutions Private Limited",
      education: "B.Tech - Information Technology",
      totalExperience: 13,
    });
    expect(response.body.resume.skills).toEqual(
      expect.arrayContaining(["Python", "RAG", "DeepEval", "C#"]),
    );
  });
});
