import { detectSkills } from "../../../config/skills";
import type { ParsedResume } from "../types/ingestion.types";
import {
  extractEmail,
  extractExperienceYears,
  extractPhone,
} from "../utils/regex";
import { cleanText } from "../utils/textCleaner";

const TITLE_PATTERN =
  /\b(architect|engineer|manager|lead|developer|tester|sdet|consultant|analyst|specialist|director)\b/i;

const COMPANY_PATTERN =
  /\b(limited|ltd\.?|pvt\.?|private limited|inc\.?|llc|gmbh|solutions|technologies)\b/i;

const EDUCATION_PATTERN =
  /\b((?:B\.?\s*Tech|B\.E\.|M\.?\s*Tech|M\.S\.|MBA|Bachelor(?:'s)?|Master(?:'s)?|Ph\.?D)[^\n,]*)/i;

const EXTRA_SKILL_PHRASES = ["Selenium WebDriver", "Core Java"];

const linesOf = (text: string): string[] => {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const looksLikeName = (line: string): boolean => {
  if (line.includes("@") || /https?:/i.test(line) || /\d{6,}/.test(line)) {
    return false;
  }

  if (TITLE_PATTERN.test(line) || COMPANY_PATTERN.test(line)) {
    return false;
  }

  const words = line.split(/\s+/);
  if (words.length < 2 || words.length > 5) {
    return false;
  }

  return words.every((word) => /^[A-Z][A-Za-z.]*$/.test(word));
};

const extractName = (text: string): string | undefined => {
  return linesOf(text).slice(0, 8).find(looksLikeName);
};

const extractRole = (text: string): string | undefined => {
  return linesOf(text)
    .slice(0, 12)
    .find((line) => TITLE_PATTERN.test(line) && line.length <= 80 && !COMPANY_PATTERN.test(line));
};

const extractCompany = (text: string): string | undefined => {
  return linesOf(text).find(
    (line) => COMPANY_PATTERN.test(line) && !TITLE_PATTERN.test(line) && line.length <= 100,
  );
};

const extractEducation = (text: string): string | undefined => {
  const match = text.match(EDUCATION_PATTERN);
  const value = match?.[1]?.trim();
  return value && value.length <= 80 ? value : undefined;
};

const extractJobTitles = (text: string): string[] => {
  const titles = linesOf(text).filter(
    (line) => TITLE_PATTERN.test(line) && line.length <= 80,
  );

  return [...new Set(titles)];
};

const detectParserSkills = (text: string): string[] => {
  const dictionarySkills = detectSkills(text);
  const extraSkills = EXTRA_SKILL_PHRASES.filter((skill) =>
    new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text),
  );

  const combined = [...extraSkills, ...dictionarySkills];
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const skill of combined) {
    const key = skill.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(skill);
    }
  }

  return ordered;
};

export class AlgorithmResumeParser {
  extractContactAndExperience(rawText: string): {
    email?: string;
    phone?: string;
    totalExperience?: number;
  } {
    return {
      email: extractEmail(rawText),
      phone: extractPhone(rawText),
      totalExperience: extractExperienceYears(rawText),
    };
  }

  parseResume(rawText: string): ParsedResume {
    const text = cleanText(rawText);
    const contact = this.extractContactAndExperience(text);
    const resume: ParsedResume = {
      skills: detectParserSkills(text),
    };

    const name = extractName(text);
    const role = extractRole(text);
    const company = extractCompany(text);
    const education = extractEducation(text);
    const jobTitles = extractJobTitles(text);

    if (name) {
      resume.name = name;
    }
    if (contact.email) {
      resume.email = contact.email;
    }
    if (contact.phone) {
      resume.phone = contact.phone;
    }
    if (company) {
      resume.company = company;
    }
    if (role) {
      resume.role = role;
    }
    if (education) {
      resume.education = education;
    }
    if (contact.totalExperience !== undefined) {
      resume.totalExperience = contact.totalExperience;
    }
    if (jobTitles.length > 0) {
      resume.jobTitles = jobTitles;
    }

    const hasMeaningfulResumeData = Boolean(
      resume.name ||
        resume.role ||
        resume.company ||
        resume.education ||
        resume.skills.length > 0 ||
        resume.email ||
        resume.phone ||
        resume.totalExperience !== undefined,
    );

    if (!hasMeaningfulResumeData) {
      throw new Error("Resume parsing failed");
    }

    return resume;
  }
}
