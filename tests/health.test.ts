import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

describe("GET /v1/health", () => {
  it("returns the Phase 1 application health", async () => {
    const response = await request(app).get("/v1/health").expect(200);

    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(response.body).toEqual({
      status: "ok",
      app: "resume-rag-backend",
      version: "1.0.0",
      uptime: expect.any(Number),
    });
  });
});
