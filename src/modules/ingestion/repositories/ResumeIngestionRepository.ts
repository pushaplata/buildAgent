import { ObjectId } from "mongodb";
import { getResumesCollection } from "../../../config/database";

export interface ResumeStorePayload {
  fileName?: string;
  rawText?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  company?: string | null;
  role?: string | null;
  education?: string | null;
  totalExperience?: number | null;
  relevantExperience?: number | null;
  skills?: string[];
  jobTitles?: string[];
  experienceSummary?: string | null;
  embedding?: number[];
  embeddingModel?: string;
  embeddingDimension?: number;
}

export class ResumeIngestionRepository {
  async getStoredFileNames(): Promise<Set<string>> {
    const documents = await getResumesCollection()
      .find({ fileName: { $type: "string" } }, { projection: { fileName: 1 } })
      .toArray();

    return new Set(
      documents
        .map((document) => document.fileName)
        .filter((fileName): fileName is string => typeof fileName === "string"),
    );
  }

  async storeResume(payload: ResumeStorePayload): Promise<string> {
    const collection = getResumesCollection();
    const now = new Date();

    const document = {
      fileName: payload.fileName ?? null,
      rawText: payload.rawText ?? "",
      name: payload.name ?? null,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      location: payload.location ?? null,
      company: payload.company ?? null,
      role: payload.role ?? null,
      education: payload.education ?? null,
      totalExperience: payload.totalExperience ?? null,
      relevantExperience: payload.relevantExperience ?? null,
      skills: Array.isArray(payload.skills) ? payload.skills : [],
      jobTitles: Array.isArray(payload.jobTitles) ? payload.jobTitles : [],
      experienceSummary: payload.experienceSummary ?? null,
      embedding: Array.isArray(payload.embedding) ? payload.embedding : [],
      embeddingModel: payload.embeddingModel ?? "mistral-embed",
      embeddingDimension: Number(payload.embeddingDimension ?? 1024),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const result = await collection.insertOne(document);
    return result.insertedId instanceof ObjectId ? result.insertedId.toHexString() : String(result.insertedId);
  }
}
