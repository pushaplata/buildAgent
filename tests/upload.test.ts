import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";
import { uploadsDirectory } from "../src/config/multerConfig";

const MINIMAL_PDF = Buffer.from(
  "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
);

const listUploadFiles = (): string[] => {
  if (!fs.existsSync(uploadsDirectory)) {
    return [];
  }

  return fs.readdirSync(uploadsDirectory);
};

describe("POST /v1/resume/upload", () => {
  afterAll(() => {
    if (!fs.existsSync(uploadsDirectory)) {
      return;
    }

    for (const fileName of fs.readdirSync(uploadsDirectory)) {
      fs.unlinkSync(path.join(uploadsDirectory, fileName));
    }
  });

  it("accepts a PDF and returns file metadata", async () => {
    const before = listUploadFiles();

    const response = await request(app)
      .post("/v1/resume/upload")
      .attach("file", MINIMAL_PDF, "resume.pdf")
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "Resume uploaded successfully",
      file: {
        originalName: "resume.pdf",
        mimeType: "application/pdf",
        size: MINIMAL_PDF.length,
      },
    });
    expect(listUploadFiles()).toEqual(before);
  });

  it("rejects a missing file field", async () => {
    const response = await request(app).post("/v1/resume/upload").expect(400);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "FILE_REQUIRED",
      message: "Resume PDF is required",
    });
  });

  it("rejects a non-PDF file", async () => {
    const response = await request(app)
      .post("/v1/resume/upload")
      .attach("file", Buffer.from("not a pdf"), "resume.txt")
      .expect(415);

    expect(response.body).toMatchObject({
      success: false,
      errorCode: "INVALID_FILE_TYPE",
      message: "Only PDF files are allowed",
    });
  });

  it("rejects a file larger than 5 MB", async () => {
    const oversizedPath = path.join(os.tmpdir(), "oversized-resume.pdf");
    fs.writeFileSync(oversizedPath, Buffer.alloc(5 * 1024 * 1024 + 1, 37));

    try {
      const response = await request(app)
        .post("/v1/resume/upload")
        .attach("file", oversizedPath)
        .expect(413);

      expect(response.body).toMatchObject({
        success: false,
        errorCode: "FILE_TOO_LARGE",
        message: "Resume exceeds maximum upload size",
      });
    } finally {
      fs.unlinkSync(oversizedPath);
    }
  });
});
