import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const requestId = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const id = request.header("x-request-id")?.trim() || randomUUID();

  response.locals.requestId = id;
  response.setHeader("x-request-id", id);
  next();
};
