import { describe, expect, it } from "@jest/globals";
import { AlgorithmResumeParser } from "../src/modules/ingestion/services/AlgorithmResumeParser";
import {
  EMAIL_REGEX,
  EXPERIENCE_REGEX,
  PHONE_REGEX,
  extractEmail,
  extractExperienceYears,
  extractPhone,
} from "../src/modules/ingestion/utils/regex";

describe("regex utilities", () => {
  it("extracts 13 from 13+ years of experience", () => {
    expect(extractExperienceYears("13+ years of experience")).toBe(13);
  });

  it("extracts whole and decimal experience values", () => {
    expect(extractExperienceYears("10 years")).toBe(10);
    expect(extractExperienceYears("8.5 yrs")).toBe(8.5);
    expect("10 years".match(EXPERIENCE_REGEX)?.[1]).toBe("10");
  });

  it("extracts an email address", () => {
    const text = "Contact: rajesh.kumar@testleaf.com";
    expect(extractEmail(text)).toBe("rajesh.kumar@testleaf.com");
    expect(text.match(EMAIL_REGEX)?.[0]).toBe("rajesh.kumar@testleaf.com");
  });

  it("extracts an Indian phone number", () => {
    const text = "Mobile: +91 9876543210";
    expect(extractPhone(text)).toBe("+91 9876543210");
    expect(text.match(PHONE_REGEX)?.[0]).toBe("+91 9876543210");
  });
});

describe("AlgorithmResumeParser", () => {
  it("consumes the regex utilities for contact and experience", () => {
    const parser = new AlgorithmResumeParser();

    expect(
      parser.extractContactAndExperience(
        "rajesh.kumar@testleaf.com +91 9876543210 13+ years of experience",
      ),
    ).toEqual({
      email: "rajesh.kumar@testleaf.com",
      phone: "+91 9876543210",
      totalExperience: 13,
    });
  });
});
