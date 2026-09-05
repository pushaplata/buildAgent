import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import { app } from "../src/app";

describe("GET /v1/resume/health", () => {
  it("returns ingestion module readiness", async () => {
    const response = await request(app).get("/v1/resume/health").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      module: "resume-ingestion",
    });
  });
});
