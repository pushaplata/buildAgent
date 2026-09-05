import type { ParsedResume } from "../types/ingestion.types";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";

const isValidResume = (resume: ParsedResume): boolean => {
  if (!Array.isArray(resume.skills)) {
    return false;
  }

  const candidateFields = [resume.name, resume.role, resume.company, resume.education];
  return candidateFields.some((value) => typeof value === "string" && value.trim().length > 0)
    || resume.skills.length > 0;
};

export class LLMResumeParser extends AlgorithmResumeParser {
  parseResume(rawText: string): ParsedResume {
    const resume = super.parseResume(rawText);

    if (!isValidResume(resume)) {
      throw new Error("Invalid LLM parser response");
    }

    return resume;
  }
}
