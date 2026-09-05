import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { AppError } from "../src/middleware/appError";
import { ResumeIngestionRepository } from "../src/modules/ingestion/repositories/ResumeIngestionRepository";
import { ResumeIngestionService } from "../src/modules/ingestion/services/ResumeIngestionService";

describe("POST /v1/resume/batch-ingest", () => {
  const testDir = path.join(process.cwd(), "tmp-batch-test");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(path.join(testDir, "resume-1.pdf"), "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    await fs.writeFile(path.join(testDir, "resume-2.pdf"), "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    for (let index = 3; index <= 12; index += 1) {
      await fs.writeFile(path.join(testDir, `resume-${index}.pdf`), "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    }
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    try {
      const files = await fs.readdir(testDir);
      for (const file of files) {
        await fs.unlink(path.join(testDir, file));
      }
      await fs.rmdir(testDir);
    } catch {
      // no-op
    }
  });

  it("processes resume files in batches and summarizes the result", async () => {
    jest.spyOn(ResumeIngestionRepository.prototype, "getStoredFileNames").mockResolvedValue(new Set());
    const ingestSpy = jest.spyOn(ResumeIngestionService.prototype, "ingestResume").mockImplementation(
      async (file: Express.Multer.File) => ({
        resumeId: `batch-${file.originalname}`,
        data: {
          name: "Resume Name",
          role: "QA Engineer",
          company: "Testleaf",
          totalExperience: 3,
          skillsCount: 2,
          embeddingModel: "mistral-embed",
          embeddingDimension: 1024,
        },
        timings: {
          extractMs: 1,
          cleanMs: 1,
          parseMs: 1,
          embeddingMs: 1,
          mongoInsertMs: 1,
          totalMs: 4,
        },
      }),
    );

    const response = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ folderPath: "tmp-batch-test" })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.batchSize).toBe(10);
    expect(response.body.processed).toBe(10);
    expect(response.body.totalAvailable).toBe(12);
    expect(response.body.remaining).toBe(2);
    expect(response.body.complete).toBe(false);
    expect(ingestSpy).toHaveBeenCalledTimes(10);
  });

  it("selects the next ten files and reports completion after the final batch", async () => {
    const storedFileNamesSpy = jest
      .spyOn(ResumeIngestionRepository.prototype, "getStoredFileNames")
      .mockResolvedValueOnce(new Set())
      .mockResolvedValueOnce(new Set(Array.from({ length: 10 }, (_, index) => `resume-${index + 1}.pdf`)));
    const ingestSpy = jest.spyOn(ResumeIngestionService.prototype, "ingestResume").mockImplementation(
      async (file: Express.Multer.File) => ({
        resumeId: `batch-${file.originalname}`,
        data: { skillsCount: 0, embeddingModel: "mistral-embed", embeddingDimension: 1024 },
        timings: { extractMs: 1, cleanMs: 1, parseMs: 1, embeddingMs: 1, mongoInsertMs: 1, totalMs: 4 },
      }),
    );

    const firstResponse = await request(app).post("/v1/resume/batch-ingest").send({ folderPath: "tmp-batch-test" }).expect(200);
    const secondResponse = await request(app).post("/v1/resume/batch-ingest").send({ folderPath: "tmp-batch-test" }).expect(200);

    expect(firstResponse.body.results[0].fileName).toBe("resume-1.pdf");
    expect(secondResponse.body.results.map((entry: { fileName: string }) => entry.fileName)).toEqual(["resume-11.pdf", "resume-12.pdf"]);
    expect(secondResponse.body.complete).toBe(true);
    expect(secondResponse.body.remaining).toBe(0);
    expect(ingestSpy).toHaveBeenCalledTimes(12);
    expect(storedFileNamesSpy).toHaveBeenCalledTimes(2);
  });

  it("ingests every resume across repeated batches of five", async () => {
    const storedFileNames = new Set<string>();
    jest
      .spyOn(ResumeIngestionRepository.prototype, "getStoredFileNames")
      .mockImplementation(async () => new Set(storedFileNames));
    const ingestSpy = jest.spyOn(ResumeIngestionService.prototype, "ingestResume").mockImplementation(
      async (file: Express.Multer.File) => {
        storedFileNames.add(file.originalname);
        return {
          resumeId: `batch-${file.originalname}`,
          data: { skillsCount: 0, embeddingModel: "mistral-embed", embeddingDimension: 1024 },
          timings: { extractMs: 1, cleanMs: 1, parseMs: 1, embeddingMs: 1, mongoInsertMs: 1, totalMs: 4 },
        };
      },
    );

    const firstResponse = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 5, folderPath: "tmp-batch-test" })
      .expect(200);
    const secondResponse = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 5, folderPath: "tmp-batch-test" })
      .expect(200);
    const thirdResponse = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 5, folderPath: "tmp-batch-test" })
      .expect(200);

    expect(firstResponse.body.processed).toBe(5);
    expect(secondResponse.body.processed).toBe(5);
    expect(thirdResponse.body.processed).toBe(2);
    expect(thirdResponse.body.remaining).toBe(0);
    expect(thirdResponse.body.complete).toBe(true);
    expect(storedFileNames.size).toBe(12);
    expect(ingestSpy).toHaveBeenCalledTimes(12);
  });

  it("accepts only batch sizes of five or ten", async () => {
    const response = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 7, folderPath: "tmp-batch-test" })
      .expect(400);

    expect(response.body.errorCode).toBe("INVALID_BATCH_SIZE");
  });

  it("uses offset to select a different file range", async () => {
    jest.spyOn(ResumeIngestionRepository.prototype, "getStoredFileNames").mockResolvedValue(new Set());
    const ingestSpy = jest.spyOn(ResumeIngestionService.prototype, "ingestResume").mockImplementation(
      async (file: Express.Multer.File) => ({
        resumeId: `batch-${file.originalname}`,
        data: { skillsCount: 0, embeddingModel: "mistral-embed", embeddingDimension: 1024 },
        timings: { extractMs: 1, cleanMs: 1, parseMs: 1, embeddingMs: 1, mongoInsertMs: 1, totalMs: 4 },
      }),
    );

    const response = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 5, offset: 5, folderPath: "tmp-batch-test" })
      .expect(200);

    expect(response.body.offset).toBe(5);
    expect(response.body.results.map((entry: { fileName: string }) => entry.fileName)).toEqual([
      "resume-3.pdf",
      "resume-4.pdf",
      "resume-5.pdf",
      "resume-6.pdf",
      "resume-7.pdf",
    ]);
    expect(ingestSpy).toHaveBeenCalledTimes(5);
  });

  it("returns the ingestion error for each failed file", async () => {
    jest.spyOn(ResumeIngestionRepository.prototype, "getStoredFileNames").mockResolvedValue(new Set());
    jest.spyOn(ResumeIngestionService.prototype, "ingestResume").mockRejectedValue(
      new AppError("RESUME_EXTRACTION_FAILED", "Resume extraction failed", 422),
    );

    const response = await request(app)
      .post("/v1/resume/batch-ingest")
      .send({ batchSize: 5, folderPath: "tmp-batch-test" })
      .expect(200);

    expect(response.body.processed).toBe(0);
    expect(response.body.failed).toBe(5);
    expect(response.body.results[0]).toMatchObject({
      status: "failed",
      resumeId: "",
      errorCode: "RESUME_EXTRACTION_FAILED",
      message: "Resume extraction failed",
    });
  });
});
