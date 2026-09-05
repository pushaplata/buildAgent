import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "./env";
import { AppError } from "../middleware/appError";

export const uploadsDirectory = path.join(process.cwd(), "uploads");

const ensureUploadsDirectory = (): void => {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
};

ensureUploadsDirectory();

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    ensureUploadsDirectory();
    callback(null, uploadsDirectory);
  },
  filename: (_request, _file, callback) => {
    callback(null, `${randomUUID()}.pdf`);
  },
});

const isPdf = (file: Express.Multer.File): boolean => {
  const extension = path.extname(file.originalname).toLowerCase();
  return file.mimetype === "application/pdf" && extension === ".pdf";
};

export const upload = multer({
  storage,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    if (isPdf(file)) {
      callback(null, true);
      return;
    }

    callback(
      new AppError("INVALID_FILE_TYPE", "Only PDF files are allowed", 415),
    );
  },
});
