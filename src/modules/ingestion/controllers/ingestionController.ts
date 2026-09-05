import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { env } from "../../../config/env";
import { detectSkills } from "../../../config/skills";
import { AppError } from "../../../middleware/appError";
import { AlgorithmResumeParser } from "../services/AlgorithmResumeParser";
import { EmbeddingService } from "../services/EmbeddingService";
import { LLMResumeParser } from "../services/LLMResumeParser";
import { ResumeIngestionService } from "../services/ResumeIngestionService";
import { ResumeParserService } from "../services/ResumeParserService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanText } from "../utils/textCleaner";

const resumeParserService = new ResumeParserService();
const algorithmResumeParser = new AlgorithmResumeParser();
const llmResumeParser = new LLMResumeParser();
const embeddingService = new EmbeddingService();
const resumeIngestionRepository = new ResumeIngestionRepository();
const resumeIngestionService = new ResumeIngestionService();
const excludedBatchFileNames = new Set(["PAN CARD CO-APP.pdf"]);

const requireRawText = (request: Request): string => {
  const rawText = request.body?.rawText;

  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    throw new AppError("RAW_TEXT_REQUIRED", "rawText is required", 400);
  }

  return rawText;
};

const requireUploadedPdf = (request: Request) => {
  const file = request.file;

  if (!file) {
    throw new AppError("FILE_REQUIRED", "Resume PDF is required", 400);
  }

  return file;
};

const removeTempFile = async (filePath: string): Promise<void> => {
  await fs.unlink(filePath).catch(() => undefined);
};

export const getResumeModuleHealth = (_request: Request, response: Response): void => {
  response.status(200).json({
    status: "ok",
    module: "resume-ingestion",
  });
};

export const uploadResume = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const file = requireUploadedPdf(request);

  try {
    response.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      file: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
  } finally {
    await removeTempFile(file.path);
  }
};

export const extractResume = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const file = requireUploadedPdf(request);

  try {
    const rawText = await resumeParserService.extractTextFromPdf(file.path);

    response.status(200).json({
      success: true,
      rawText,
      characters: rawText.length,
    });
  } finally {
    await removeTempFile(file.path);
  }
};

export const cleanResume = (request: Request, response: Response): void => {
  const rawText = requireRawText(request);

  response.status(200).json({
    success: true,
    cleanText: cleanText(rawText),
  });
};

export const detectResumeSkills = (request: Request, response: Response): void => {
  const rawText = requireRawText(request);

  response.status(200).json({
    success: true,
    skills: detectSkills(rawText),
  });
};

export const parseResume = (request: Request, response: Response): void => {
  const rawText = requireRawText(request);

  try {
    const resume = algorithmResumeParser.parseResume(rawText);

    response.status(200).json({
      success: true,
      resume,
    });
  } catch (_error) {
    throw new AppError("RESUME_PARSE_FAILED", "Resume parsing failed", 422);
  }
};

export const llmParseResume = (request: Request, response: Response): void => {
  const rawText = requireRawText(request);

  if (!env.useLlmParser) {
    response.status(200).json({
      success: false,
      errorCode: "LLM_PARSER_DISABLED",
      message: "LLM resume parser is disabled",
    });
    return;
  }

  const resume = llmResumeParser.parseResume(rawText);

  response.status(200).json({
    success: true,
    resume,
  });
};

export const embedResume = async (request: Request, response: Response): Promise<void> => {
  const payload = request.body ?? {};

  const result = await embeddingService.generateEmbedding({
    name: payload.name,
    role: payload.role,
    skills: payload.skills,
    company: payload.company,
    experienceSummary: payload.experienceSummary,
    rawText: payload.rawText,
  });

  response.status(200).json({
    success: true,
    model: result.model,
    dimension: result.dimension,
    embedding: result.embedding,
  });
};

export const storeResume = async (request: Request, response: Response): Promise<void> => {
  const payload = request.body ?? {};
  const resumePayload = payload.resume ?? {};

  const resumeId = await resumeIngestionRepository.storeResume({
    fileName: payload.fileName,
    rawText: payload.rawText,
    name: resumePayload.name ?? payload.name,
    email: resumePayload.email ?? null,
    phone: resumePayload.phone ?? null,
    location: resumePayload.location ?? null,
    company: resumePayload.company ?? payload.company,
    role: resumePayload.role ?? payload.role,
    education: resumePayload.education ?? null,
    totalExperience: resumePayload.totalExperience ?? null,
    relevantExperience: resumePayload.relevantExperience ?? null,
    skills: Array.isArray(resumePayload.skills) ? resumePayload.skills : [],
    jobTitles: Array.isArray(resumePayload.jobTitles) ? resumePayload.jobTitles : [],
    experienceSummary: resumePayload.experienceSummary ?? null,
    embedding: Array.isArray(payload.embedding) ? payload.embedding : [],
    embeddingModel: "mistral-embed",
    embeddingDimension: 1024,
  });

  response.status(200).json({
    success: true,
    message: "Resume stored successfully",
    resumeId,
  });
};

export const ingestResume = async (request: Request, response: Response): Promise<void> => {
  const file = request.file;

  if (!file) {
    throw new AppError("FILE_REQUIRED", "Resume PDF is required", 400);
  }

  try {
    const result = await resumeIngestionService.ingestResume(file);
    response.locals.ingestionTimings = result.timings;
    response.status(200).json({
      success: true,
      message: "Resume ingestion completed",
      resumeId: result.resumeId,
      data: result.data,
      timings: result.timings,
    });
  } finally {
    await fs.unlink(file.path).catch(() => undefined);
  }
};

export const batchIngestResumes = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const payload = request.body ?? {};
  const requestedBatchSize = Number(payload.batchSize ?? 10);
  const requestedOffset = Number(payload.offset ?? 0);
  const hasExplicitOffset = payload.offset !== undefined;
  const folderInput = typeof payload.folderPath === "string" ? payload.folderPath : "Resumes";

  if (requestedBatchSize !== 5 && requestedBatchSize !== 10) {
    throw new AppError("INVALID_BATCH_SIZE", "Batch size must be 5 or 10", 400);
  }

  if (!Number.isInteger(requestedOffset) || requestedOffset < 0) {
    throw new AppError("INVALID_OFFSET", "Offset must be a non-negative integer", 400);
  }

  const folderPath = path.isAbsolute(folderInput)
    ? folderInput
    : path.join(process.cwd(), folderInput);

  const fileNames = await fs.readdir(folderPath);
  const pdfFiles = fileNames
    .filter((fileName) => fileName.toLowerCase().endsWith(".pdf"))
    .filter((fileName) => !excludedBatchFileNames.has(fileName))
    .sort((a, b) => a.localeCompare(b));

  const totalAvailable = pdfFiles.length;
  const storedFileNames = await resumeIngestionRepository.getStoredFileNames();
  const pendingFiles = pdfFiles.filter((fileName) => !storedFileNames.has(fileName));
  const selectedFiles = pendingFiles.slice(
    hasExplicitOffset ? requestedOffset : 0,
    (hasExplicitOffset ? requestedOffset : 0) + requestedBatchSize,
  );

  const processedResults = [] as Array<{
    fileName: string;
    resumeId: string;
    status: "success" | "failed";
    errorCode?: string;
    message?: string;
  }>;

  for (const fileName of selectedFiles) {
    const absoluteFilePath = path.join(folderPath, fileName);

    try {
      const fileBuffer = await fs.readFile(absoluteFilePath);
      const filePayload = {
        fieldname: "file",
        originalname: fileName,
        encoding: "7bit",
        mimetype: "application/pdf",
        size: fileBuffer.length,
        path: absoluteFilePath,
        buffer: fileBuffer,
      };
      const result = await resumeIngestionService.ingestResume(filePayload as Express.Multer.File);
      processedResults.push({
        fileName,
        resumeId: result.resumeId,
        status: "success",
      });
    } catch (error) {
      const errorCode = error instanceof AppError ? error.errorCode : "BATCH_FILE_FAILED";
      const message = error instanceof AppError ? error.message : "Resume ingestion failed";

      console.error(JSON.stringify({ fileName, errorCode, message }));
      processedResults.push({
        fileName,
        resumeId: "",
        status: "failed",
        errorCode,
        message,
      });
    }
  }

  const processed = processedResults.filter((entry) => entry.status === "success").length;
  const failed = processedResults.filter((entry) => entry.status === "failed").length;
  const complete = pendingFiles.length === 0 || (selectedFiles.length === pendingFiles.length && failed === 0);

  if (complete) {
    console.info(JSON.stringify({
      message: "Batch resume ingestion completed: all resumes are ingested",
      folderPath,
      totalAvailable,
    }));
  }

  response.status(200).json({
    success: true,
    folderPath,
    batchSize: requestedBatchSize,
    offset: requestedOffset,
    totalAvailable,
    pendingBeforeRun: pendingFiles.length,
    processed,
    failed,
    remaining: pendingFiles.length - processed,
    complete,
    results: processedResults,
  });
};
