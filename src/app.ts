import cors from "cors";
import express from "express";
import { getDatabaseHealth } from "./config/database";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./middleware/logger";
import { requestId } from "./middleware/requestId";
import { ingestionRoutes } from "./modules/ingestion/routes/ingestionRoutes";

export const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json());
app.use(requestId);
app.use(logger);

app.get("/v1/health", (_request, response) => {
  response.status(200).json({
    status: "ok",
    app: env.appName,
    version: env.version,
    uptime: Number(process.uptime().toFixed(1)),
  });
});

app.get("/v1/health/db", async (_request, response) => {
  const health = await getDatabaseHealth();
  const statusCode = health.status === "ok" ? 200 : 503;

  response.status(statusCode).json(health);
});

app.use("/v1", ingestionRoutes);

app.use(errorHandler);
