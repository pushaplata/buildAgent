import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { AppError } from "./appError";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      requestId: response.locals.requestId,
      errorCode: error.errorCode,
      message: error.message,
    });
    return;
  }

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(413).json({
      success: false,
      requestId: response.locals.requestId,
      errorCode: "FILE_TOO_LARGE",
      message: "Resume exceeds maximum upload size",
    });
    return;
  }

  console.error(
    JSON.stringify({
      requestId: response.locals.requestId,
      error: error instanceof Error ? error.message : "Unknown error",
    }),
  );

  response.status(500).json({
    success: false,
    requestId: response.locals.requestId,
    errorCode: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
};
