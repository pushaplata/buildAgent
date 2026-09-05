import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../../../config/env";
import { AppError } from "../../../middleware/appError";

const execFileAsync = promisify(execFile);

export class OcrService {
  async extractTextFromPdf(filePath: string): Promise<string> {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "resume-ocr-"));

    try {
      const imagePrefix = path.join(temporaryDirectory, "page");
      await execFileAsync("pdftoppm", ["-png", "-r", "200", filePath, imagePrefix]);
      const imageFiles = (await fs.readdir(temporaryDirectory))
        .filter((fileName) => fileName.endsWith(".png"))
        .sort();

      if (imageFiles.length === 0) {
        throw new Error("PDF rasterizer produced no pages");
      }

      const textPages: string[] = [];
      for (const imageFile of imageFiles) {
        const result = await execFileAsync("tesseract", [
          path.join(temporaryDirectory, imageFile),
          "stdout",
          "-l",
          env.ocrLanguage,
        ]);
        textPages.push(result.stdout);
      }

      const text = textPages.join("\n").trim();
      if (!text) {
        throw new AppError("OCR_FAILED", "OCR produced no text", 422);
      }

      return text;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const commandError = error as NodeJS.ErrnoException;
      if (commandError.code === "ENOENT") {
        throw new AppError(
          "OCR_UNAVAILABLE",
          "OCR requires pdftoppm and tesseract to be installed",
          422,
        );
      }

      throw new AppError("OCR_FAILED", "OCR failed to extract resume text", 422);
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}