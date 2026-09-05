import { app } from "./app";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";

const start = async (): Promise<void> => {
  try {
    await connectDatabase();
    console.info(
      JSON.stringify({
        message: "MongoDB connected",
        database: env.mongodbDbName,
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "MongoDB connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }

  const server = app.listen(env.port, () => {
    console.info(
      JSON.stringify({
        message: `${env.appName} is listening`,
        port: env.port,
        environment: env.nodeEnv,
      }),
    );
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    console.info(JSON.stringify({ message: "Shutting down", signal }));
    server.close((error) => {
      if (error) {
        console.error(
          JSON.stringify({
            message: "Server shutdown failed",
            error: error.message,
          }),
        );
        process.exitCode = 1;
      }
    });

    void disconnectDatabase();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

void start();
