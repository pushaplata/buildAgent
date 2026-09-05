import { afterAll, describe, expect, it, jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { uploadsDirectory } from "../src/config/multerConfig";
import { createPdfWithText } from "./helpers/pdf";

jest.mock("pdf-parse", () => {
  return async (dataBuffer: Buffer) => {
    const source = dataBuffer.toString("latin1");
    if (source.includes("INVALID_HEX_TEST")) {
      console.log('Warning: Ignoring invalid character "165" in hex string');
    }
    if (source.includes("UNDEFINED_FUNCTION_TEST")) {
      console.log("Warning: TT: undefined function: 32");
    }

    if (source.includes("Rajesh Mohan Kumar")) {
      return {
        text: "Rajesh Mohan Kumar Test Architect Selenium Python RAG DeepEval",
        numpages: 1,
      };
    }

    return { text: "", numpages: 1 };
  };
});

import { app } from "../src/app";

const EMPTY_PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
);

const SAMPLE_TEXT =
  "Rajesh Mohan Kumar Test Architect Selenium Python RAG DeepEval";

const listUploadFiles = (): string[] => {
  if (!fs.existsSync(uploadsDirectory)) {
    return [];
  }

  return fs.readdirSync(uploadsDirectory);
};

describe("POST /v1/resume/extract", () => {
  afterAll(() => {
    if (!fs.existsSync(uploadsDirectory)) {
      return;
    }

    for (const fileName of fs.readdirSync(uploadsDirectory)) {
      fs.unlinkSync(path.join(uploadsDirectory, fileName));
    }
  });

  it("extracts raw text from a PDF", async () => {
    const before = listUploadFiles();
    const pdf = createPdfWithText(SAMPLE_TEXT);

    const response = await request(app)
      .post("/v1/resume/extract")
      .attach("file", pdf, "resume.pdf")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.rawText).toEqual(expect.stringContaining("Rajesh Mohan Kumar"));
    expect(response.body.rawText).toEqual(expect.stringContaining("Selenium"));
    expect(response.body.rawText).toEqual(expect.stringContaining("Python"));
    expect(response.body.characters).toBe(response.body.rawText.length);
    expect(listUploadFiles()).toEqual(before);
  });

  it("fails when extracted text is empty", async () => {
    const originalOcrEnabled = process.env.OCR_ENABLED;
    process.env.OCR_ENABLED = "false";

    let response;
    try {
      response = await request(app)
        .post("/v1/resume/extract")
        .attach("file", EMPTY_PDF, "empty.pdf")
        .expect(422);
    } finally {
      if (originalOcrEnabled === undefined) {
        delete process.env.OCR_ENABLED;
      } else {
        process.env.OCR_ENABLED = originalOcrEnabled;
      }
    }

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "RESUME_EXTRACTION_FAILED",
      message: "Resume extraction failed",
    });
  });

  it("rejects a missing file field", async () => {
    const response = await request(app).post("/v1/resume/extract").expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "FILE_REQUIRED",
      message: "Resume PDF is required",
    });
  });

  it("does not expose the recoverable invalid hex parser warning", async () => {
    const originalConsoleLog = console.log;
    const consoleLogSpy = jest.spyOn(console, "log");
    consoleLogSpy.mockImplementation((message?: unknown, ...optionalParams: unknown[]) => {
      originalConsoleLog(message, ...optionalParams);
    });

    const response = await request(app)
      .post("/v1/resume/extract")
      .attach("file", Buffer.from("INVALID_HEX_TEST Rajesh Mohan Kumar"), "resume.pdf")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      'Warning: Ignoring invalid character "165" in hex string',
    );
  });

  it("does not expose the recoverable TrueType warning", async () => {
    const consoleLogSpy = jest.spyOn(console, "log");

    const response = await request(app)
      .post("/v1/resume/extract")
      .attach("file", Buffer.from("UNDEFINED_FUNCTION_TEST Rajesh Mohan Kumar"), "resume.pdf")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(consoleLogSpy).not.toHaveBeenCalledWith("Warning: TT: undefined function: 32");
  });
});
