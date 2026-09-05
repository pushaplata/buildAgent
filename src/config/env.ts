import dotenv from "dotenv";

dotenv.config();

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  name: string,
): number => {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
};

const parsePort = (value: string | undefined): number => {
  const port = parsePositiveInteger(value, 3000, "PORT");

  if (port > 65_535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return port;
};

export const env = Object.freeze({
  appName: "resume-rag-backend",
  version: "1.0.0",
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
  mongodbUri: process.env.MONGODB_URI ?? "",
  mongodbDbName: process.env.MONGODB_DB_NAME ?? "resume_rag",
  collectionName: process.env.COLLECTION_NAME ?? "resumes",
  get useLlmParser(): boolean {
    return process.env.USE_LLM_PARSER === "true";
  },
  get useOcrFallback(): boolean {
    return process.env.OCR_ENABLED === "true";
  },
  ocrLanguage: process.env.OCR_LANGUAGE ?? "eng",
  maxUploadSizeMb: parsePositiveInteger(
    process.env.MAX_UPLOAD_SIZE_MB,
    5,
    "MAX_UPLOAD_SIZE_MB",
  ),
});
