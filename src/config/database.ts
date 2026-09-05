import { MongoClient, type Collection, type Db, type Document } from "mongodb";
import { env } from "./env";

const RESUMES_COLLECTION = env.collectionName ?? "resumes";

let client: MongoClient | null = null;
let database: Db | null = null;

export const connectDatabase = async (): Promise<void> => {
  if (client && database) {
    return;
  }

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const nextClient = new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: 5000,
  });

  await nextClient.connect();
  client = nextClient;
  database = nextClient.db(env.mongodbDbName);
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  database = null;
};

export const isDatabaseConnected = (): boolean => {
  return client !== null && database !== null;
};

export const getResumesCollection = (): Collection<Document> => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database.collection(RESUMES_COLLECTION);
};

export const getDatabaseHealth = async (): Promise<
  | {
      status: "ok";
      database: "mongodb";
      connected: true;
      latencyMs: number;
    }
  | {
      status: "error";
      database: "mongodb";
      connected: false;
      errorCode: "DB_CONNECTION_FAILED";
    }
> => {
  const startedAt = Date.now();

  try {
    if (!client || !database) {
      return {
        status: "error",
        database: "mongodb",
        connected: false,
        errorCode: "DB_CONNECTION_FAILED",
      };
    }

    await database.command({ ping: 1 });
    await getResumesCollection().estimatedDocumentCount();

    return {
      status: "ok",
      database: "mongodb",
      connected: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      status: "error",
      database: "mongodb",
      connected: false,
      errorCode: "DB_CONNECTION_FAILED",
    };
  }
};
