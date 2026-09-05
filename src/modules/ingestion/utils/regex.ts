export const EMAIL_REGEX =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

export const PHONE_REGEX =
  /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;

export const EXPERIENCE_REGEX =
  /(\d+(\.\d+)?)\s*(years|yrs)/i;

const EXPERIENCE_VALUE_REGEX =
  /(\d+(\.\d+)?)\+?\s*(years|yrs)/i;

export const extractEmail = (text: string): string | undefined => {
  const match = text.match(EMAIL_REGEX);
  return match?.[0];
};

export const extractPhone = (text: string): string | undefined => {
  const match = text.match(PHONE_REGEX);
  return match?.[0];
};

export const extractExperienceYears = (text: string): number | undefined => {
  const match = text.match(EXPERIENCE_VALUE_REGEX) ?? text.match(EXPERIENCE_REGEX);
  const value = match?.[1];

  if (value === undefined) {
    return undefined;
  }

  return Number(value);
};
