import { describe, expect, it } from "@jest/globals";
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

describe("POST /v1/resume/parse", () => {
  it("returns structured resume JSON", async () => {
    const response = await request(app)
      .post("/v1/resume/parse")
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

  it("returns a parsing failure when the provided text is not a resume", async () => {
    const response = await request(app)
      .post("/v1/resume/parse")
      .send({ rawText: "This is just a random document with no resume data at all." })
      .expect(422);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "RESUME_PARSE_FAILED",
      message: "Resume parsing failed",
    });
  });
});
