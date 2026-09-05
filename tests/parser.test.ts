import { describe, expect, it } from "@jest/globals";
import { AlgorithmResumeParser } from "../src/modules/ingestion/services/AlgorithmResumeParser";

const SAMPLE_RESUME = `
Rajesh Mohan Kumar
Test Architect & Senior Agentic Test Engineer
13+ years of experience
Testleaf Software Solutions Private Limited
B.Tech - Information Technology
Skills: Selenium WebDriver, Core Java, C#, Python, REST Assured, Postman, RAG, DeepEval, MCP (Model Context Protocol)
Lead Test Engineer
`.trim();

describe("AlgorithmResumeParser.parseResume", () => {
  const parser = new AlgorithmResumeParser();

  it("extracts structured fields from cleaned resume text without inventing values", () => {
    const resume = parser.parseResume(SAMPLE_RESUME);

    expect(resume.name).toBe("Rajesh Mohan Kumar");
    expect(resume.role).toBe("Test Architect & Senior Agentic Test Engineer");
    expect(resume.company).toBe("Testleaf Software Solutions Private Limited");
    expect(resume.education).toBe("B.Tech - Information Technology");
    expect(resume.totalExperience).toBe(13);
    expect(resume.skills).toEqual(
      expect.arrayContaining([
        "Selenium WebDriver",
        "Core Java",
        "C#",
        "Python",
        "REST Assured",
        "Postman",
        "RAG",
        "DeepEval",
        "MCP (Model Context Protocol)",
      ]),
    );
    expect(resume.location).toBeUndefined();
    expect(resume.relevantExperience).toBeUndefined();
    expect(resume.experienceSummary).toBeUndefined();
  });

  it("accepts an extractable resume when only contact data is recognized", () => {
    const resume = parser.parseResume("Candidate Name\n candidate@example.com\n");

    expect(resume.email).toBe("candidate@example.com");
    expect(resume.skills).toEqual([]);
  });
});
