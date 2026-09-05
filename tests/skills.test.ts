import { describe, expect, it } from "@jest/globals";
import { detectSkills } from "../src/config/skills";

describe("detectSkills", () => {
  it("detects dictionary skills in appearance order", () => {
    expect(
      detectSkills(
        "Experienced in Selenium WebDriver, Python, RAG, DeepEval and MCP (Model Context Protocol).",
      ),
    ).toEqual([
      "Selenium",
      "Python",
      "RAG",
      "DeepEval",
      "MCP (Model Context Protocol)",
    ]);
  });

  it("preserves C# and does not treat Java as a match inside JavaScript", () => {
    expect(detectSkills("Hands-on with C# and JavaScript.")).toEqual(["C#"]);
  });
});
