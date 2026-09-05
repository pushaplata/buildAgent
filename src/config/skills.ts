export const SKILLS = [
  "Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "MongoDB",
  "Jenkins",
  "Python",
  "C#",
  "REST Assured",
  "Cucumber",
  "GenAI",
  "Langchain",
  "Langgraph",
  "RAG",
  "Azure DevOps",
  "AWS Lambda",
  "GitHub",
  "DeepEval",
  "MCP (Model Context Protocol)",
];

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const skillPattern = (skill: string): RegExp => {
  const escaped = escapeRegExp(skill);
  const start = /^\w/.test(skill) ? "\\b" : "(?<![A-Za-z0-9])";
  const end = /\w$/.test(skill) ? "\\b" : "(?![A-Za-z0-9])";

  return new RegExp(`${start}${escaped}${end}`, "i");
};

export const detectSkills = (rawText: string): string[] => {
  const matches: Array<{ skill: string; index: number }> = [];

  for (const skill of SKILLS) {
    const match = rawText.match(skillPattern(skill));

    if (match?.index !== undefined) {
      matches.push({ skill, index: match.index });
    }
  }

  return matches
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.skill);
};
