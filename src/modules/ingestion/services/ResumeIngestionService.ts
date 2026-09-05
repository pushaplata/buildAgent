import type { Express } from "express";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/appError";
import { AlgorithmResumeParser } from "./AlgorithmResumeParser";
import { EmbeddingService } from "./EmbeddingService";
import { LLMResumeParser } from "./LLMResumeParser";
import { ResumeParserService } from "./ResumeParserService";
import { ResumeIngestionRepository } from "../repositories/ResumeIngestionRepository";
import { cleanText } from "../utils/textCleaner";

export interface IngestionSummary {
  name?: string;
  role?: string;
  company?: string;
  totalExperience?: number;
  skillsCount: number;
  embeddingModel: string;
  embeddingDimension: number;
}

export interface IngestionTimings {
  extractMs: number;
  cleanMs: number;
  parseMs: number;
  embeddingMs: number;
  mongoInsertMs: number;
  totalMs: number;
}

export interface IngestionResult {
  resumeId: string;
  data: IngestionSummary;
  timings: IngestionTimings;
}

export class ResumeIngestionService {
  private readonly parserService = new ResumeParserService();
  private readonly algorithmParser = new AlgorithmResumeParser();
  private readonly llmParser = new LLMResumeParser();
  private readonly embeddingService = new EmbeddingService();
  private readonly repository = new ResumeIngestionRepository();

  private getParser() {
    return env.useLlmParser ? this.llmParser : this.algorithmParser;
  }

  async ingestResume(file: Express.Multer.File): Promise<IngestionResult> {
    if (!file) {
      throw new AppError("FILE_REQUIRED", "Resume PDF is required", 400);
    }

    const startedAt = Date.now();

    try {
      const extractStarted = Date.now();
      const rawText = await this.parserService.extractTextFromPdf(file.path);
      const extractMs = Date.now() - extractStarted;

      const cleanStarted = Date.now();
      const cleanedText = cleanText(rawText);
      const cleanMs = Date.now() - cleanStarted;

      const parseStarted = Date.now();
      const parser = this.getParser();
      const parsedResume = parser.parseResume(cleanedText);
      const parseMs = Date.now() - parseStarted;

      const embeddingStarted = Date.now();
      const embedResult = await this.embeddingService.generateEmbedding({
        name: parsedResume.name,
        role: parsedResume.role,
        skills: parsedResume.skills,
        company: parsedResume.company,
        experienceSummary: parsedResume.experienceSummary,
        rawText: cleanedText,
      });
      const embeddingMs = Date.now() - embeddingStarted;

      const mongoStarted = Date.now();
      let resumeId: string;
      try {
        resumeId = await this.repository.storeResume({
          fileName: file.originalname,
          rawText: cleanedText,
          name: parsedResume.name,
          email: parsedResume.email ?? null,
          phone: parsedResume.phone ?? null,
          location: parsedResume.location ?? null,
          company: parsedResume.company ?? null,
          role: parsedResume.role ?? null,
          education: parsedResume.education ?? null,
          totalExperience: parsedResume.totalExperience ?? null,
          relevantExperience: parsedResume.relevantExperience ?? null,
          skills: parsedResume.skills ?? [],
          jobTitles: parsedResume.jobTitles ?? [],
          experienceSummary: parsedResume.experienceSummary ?? null,
          embedding: embedResult.embedding,
          embeddingModel: embedResult.model,
          embeddingDimension: embedResult.dimension,
        });
      } catch {
        throw new AppError("INGESTION_FAILED", "Resume ingestion failed", 500);
      }
      const mongoInsertMs = Date.now() - mongoStarted;

      const totalMs = Date.now() - startedAt;

      return {
        resumeId,
        data: {
          name: parsedResume.name,
          role: parsedResume.role,
          company: parsedResume.company,
          totalExperience: parsedResume.totalExperience,
          skillsCount: parsedResume.skills.length,
          embeddingModel: embedResult.model,
          embeddingDimension: embedResult.dimension,
        },
        timings: {
          extractMs,
          cleanMs,
          parseMs,
          embeddingMs,
          mongoInsertMs,
          totalMs,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("RESUME_PARSE_FAILED", "Resume parsing failed", 422);
    }
  }

  async ingesttResume(file: Express.Multer.File): Promise<IngestionResult> {
    return this.ingestResume(file);
  }
}
