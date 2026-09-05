import type { NextFunction, Request, Response } from "express";

const sanitize = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        if (
          key === "rawText" ||
          key === "embedding" ||
          key === "token" ||
          key === "password" ||
          key === "apiKey" ||
          key === "authorization"
        ) {
          return [];
        }

        return [[key, sanitize(entry)]];
      }),
    ) as T;
  }

  return value;
};

export const logger = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    const baseLog = {
      requestId: response.locals.requestId,
      method: request.method,
      endpoint: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    };

    if (request.method === "POST" && request.originalUrl === "/v1/resume/ingest") {
      const file = request.file;
      const timings = response.locals.ingestionTimings ?? {};
      const log = {
        ...baseLog,
        fileName: file?.originalname ?? null,
        ...timings,
      };

      console.info(JSON.stringify(sanitize(log)));
      return;
    }

    console.info(JSON.stringify(sanitize(baseLog)));
  });

  next();
};
