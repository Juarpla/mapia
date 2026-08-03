import { getDb } from "@/db";
import { imports, observations, reviews } from "@/db/schema";

export async function persistObservation(input: {
  id: string;
  segmentId: string | null;
  comment: string;
  observedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  authorUserId?: string | null;
}) {
  try {
    await getDb().insert(observations).values({
      id: input.id,
      segmentId: input.segmentId,
      authorUserId: input.authorUserId ?? null,
      observedAt: input.observedAt,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      comment: input.comment,
      source: "MapIA PWA",
      sourceRecordId: input.id,
      sourceVersion: "pwa-v1",
      status: "borrador",
      importedAt: new Date().toISOString(),
    }).onConflictDoNothing();
    return true;
  } catch {
    return false;
  }
}

export async function persistImport(input: {
  id: string;
  sha256: string;
  totalRows: number;
  linkedRows: number;
  unmatchedRows: number;
  importedBy?: string | null;
}) {
  try {
    await getDb().insert(imports).values({
      id: input.id,
      source: "RoadLab",
      sourceVersion: "csv-v1",
      sha256: input.sha256,
      importedBy: input.importedBy ?? null,
      status: "validado",
      totalRows: input.totalRows,
      linkedRows: input.linkedRows,
      unmatchedRows: input.unmatchedRows,
    }).onConflictDoNothing();
    return true;
  } catch {
    return false;
  }
}

export async function persistReview(input: {
  id: string;
  entityId: string;
  reviewerUserId: string;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
}) {
  try {
    await getDb().insert(reviews).values({
      id: input.id,
      entityType: "road_segment",
      entityId: input.entityId,
      reviewerUserId: input.reviewerUserId,
      action: input.toStatus,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      comment: input.comment,
    });
    return true;
  } catch {
    return false;
  }
}
