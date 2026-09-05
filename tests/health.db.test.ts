import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

jest.mock("../src/config/database", () => ({
  getDatabaseHealth: jest.fn(),
}));

import { app } from "../src/app";
import { getDatabaseHealth } from "../src/config/database";

const mockedGetDatabaseHealth = jest.mocked(getDatabaseHealth);

describe("GET /v1/health/db", () => {
  beforeEach(() => {
    mockedGetDatabaseHealth.mockReset();
  });

  it("returns connected health when MongoDB is reachable", async () => {
    mockedGetDatabaseHealth.mockResolvedValue({
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs: 18,
    });

    const response = await request(app).get("/v1/health/db").expect(200);

    expect(response.body).toEqual({
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs: 18,
    });
  });

  it("returns a stable failure when MongoDB is unreachable", async () => {
    mockedGetDatabaseHealth.mockResolvedValue({
      status: "error",
      database: "mongodb",
      connected: false,
      errorCode: "DB_CONNECTION_FAILED",
    });

    const response = await request(app).get("/v1/health/db").expect(503);

    expect(response.body).toEqual({
      status: "error",
      database: "mongodb",
      connected: false,
      errorCode: "DB_CONNECTION_FAILED",
    });
  });
});
