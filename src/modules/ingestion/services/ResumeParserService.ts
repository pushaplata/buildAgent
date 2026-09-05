import fs from "node:fs/promises";
import pdfParse from "pdf-parse";
import { AppError } from "../../../middleware/appError";
import { env } from "../../../config/env";
import { OcrService } from "./OcrService";

const RECOVERABLE_PDF_WARNING = /^Warning: (Ignoring invalid character "\d+" in hex string|TT: undefined function: \d+)$/;

const parsePdfWithoutRecoverableWarnings = async (dataBuffer: Buffer) => {
  const originalConsoleLog = console.log;

  console.log = (...args: unknown[]): void => {
    if (typeof args[0] === "string" && RECOVERABLE_PDF_WARNING.test(args[0])) {
      return;
    }

    originalConsoleLog(...args);
  };

  try {
    return await pdfParse(dataBuffer);
  } finally {
    console.log = originalConsoleLog;
  }
};

export class ResumeParserService {
  private readonly ocrService = new OcrService();

  async extractTextFromPdf(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);

    try {
      const parsed = await parsePdfWithoutRecoverableWarnings(dataBuffer);
      const rawText = parsed.text ?? "";

      if (rawText.trim().length === 0) {
        if (env.useOcrFallback) {
          return this.ocrService.extractTextFromPdf(filePath);
        }

        throw new AppError(
          "RESUME_EXTRACTION_FAILED",
          "Resume extraction failed",
          422,
        );
      }

      return rawText;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "RESUME_EXTRACTION_FAILED",
        "Resume extraction failed",
        422,
      );
    }
  }
}
