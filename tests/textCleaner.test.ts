import { describe, expect, it } from "@jest/globals";
import { cleanText } from "../src/modules/ingestion/utils/textCleaner";

describe("cleanText", () => {
  it("collapses extra whitespace and blank lines from the learner example", () => {
    const rawText =
      "Rajesh Mohan Kumar\n\n\nTest Architect & Senior Agentic Test Engineer   \n RAG";

    expect(cleanText(rawText)).toBe(
      "Rajesh Mohan Kumar\nTest Architect & Senior Agentic Test Engineer\nRAG",
    );
  });

  it("preserves technical skill symbols, emails, dates, and titles", () => {
    const rawText =
      "C#   C++   .NET\nLead Test Engineer\nemail@example.com\nJan 2013 - Present";

    expect(cleanText(rawText)).toBe(
      "C# C++ .NET\nLead Test Engineer\nemail@example.com\nJan 2013 - Present",
    );
  });

  it("removes control characters and normalizes Windows line breaks", () => {
    const rawText = "Rajesh\r\n\r\nPython\u0000  RAG";

    expect(cleanText(rawText)).toBe("Rajesh\nPython RAG");
  });
});
