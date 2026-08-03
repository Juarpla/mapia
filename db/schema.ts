import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
};

export const administrativeAreas = sqliteTable("administrative_areas", {
  ubigeo: text("ubigeo").primaryKey(),
  name: text("name").notNull(),
  level: text("level", { enum: ["department", "province", "district"] }).notNull(),
  parentUbigeo: text("parent_ubigeo"),
  geometryGeojson: text("geometry_geojson"),
  source: text("source").notNull(),
  sourceVersion: text("source_version"),
  importedAt: text("imported_at").notNull(),
  ...timestamps,
});

export const roads = sqliteTable("roads", {
  id: text("id").primaryKey(),
  externalId: text("external_id"),
  name: text("name").notNull(),
  roadClass: text("road_class").notNull(),
  responsibleAuthority: text("responsible_authority").notNull(),
  source: text("source").notNull(),
  license: text("license"),
  sourceVersion: text("source_version"),
  ...timestamps,
});

export const roadSegments = sqliteTable("road_segments", {
  id: text("id").primaryKey(),
  roadId: text("road_id").notNull().references(() => roads.id),
  ubigeo: text("ubigeo").notNull().references(() => administrativeAreas.ubigeo),
  code: text("code").notNull(),
  kind: text("kind", { enum: ["urbano", "rural"] }).notNull(),
  surface: text("surface").notNull(),
  lengthM: real("length_m").notNull(),
  startReference: text("start_reference"),
  endReference: text("end_reference"),
  geometryGeojson: text("geometry_geojson").notNull(),
  responsibleAuthority: text("responsible_authority").notNull(),
  status: text("status").notNull().default("borrador"),
  publishedAt: text("published_at"),
  ...timestamps,
}, (table) => [uniqueIndex("road_segments_code_idx").on(table.code)]);

export const observations = sqliteTable("observations", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id").references(() => roadSegments.id),
  authorUserId: text("author_user_id"),
  observedAt: text("observed_at").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  conditionScore: integer("condition_score"),
  comment: text("comment"),
  source: text("source").notNull(),
  sourceRecordId: text("source_record_id"),
  sourceVersion: text("source_version"),
  status: text("status").notNull().default("borrador"),
  importedAt: text("imported_at").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("observations_source_record_idx").on(table.source, table.sourceRecordId)]);

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  observationId: text("observation_id").notNull().references(() => observations.id),
  objectKey: text("object_key").notNull(),
  mediaType: text("media_type").notNull(),
  sha256: text("sha256").notNull(),
  capturedAt: text("captured_at"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  approvedObjectKey: text("approved_object_key"),
  ...timestamps,
});

export const hazardEvents = sqliteTable("hazard_events", {
  id: text("id").primaryKey(),
  hazardType: text("hazard_type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  geometryGeojson: text("geometry_geojson").notNull(),
  severity: integer("severity").notNull(),
  source: text("source").notNull(),
  license: text("license"),
  sourceVersion: text("source_version"),
  importedAt: text("imported_at").notNull(),
  ...timestamps,
});

export const satelliteCandidates = sqliteTable("satellite_candidates", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id").references(() => roadSegments.id),
  hazardType: text("hazard_type").notNull(),
  sensor: text("sensor").notNull(),
  acquiredAt: text("acquired_at").notNull(),
  baselineAt: text("baseline_at").notNull(),
  beforeObjectKey: text("before_object_key"),
  afterObjectKey: text("after_object_key"),
  geometryGeojson: text("geometry_geojson").notNull(),
  confidence: integer("confidence").notNull(),
  status: text("status").notNull().default("borrador"),
  ...timestamps,
});

export const prioritySnapshots = sqliteTable("priority_snapshots", {
  id: text("id").primaryKey(),
  segmentId: text("segment_id").notNull().references(() => roadSegments.id),
  modelVersion: text("model_version").notNull(),
  conditionScore: integer("condition_score").notNull(),
  connectivityScore: integer("connectivity_score").notNull(),
  hazardScore: integer("hazard_score").notNull(),
  priorityScore: integer("priority_score").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  intervention: text("intervention").notNull(),
  rationaleJson: text("rationale_json").notNull(),
  calculatedAt: text("calculated_at").notNull(),
  ...timestamps,
});

export const imports = sqliteTable("imports", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  sourceVersion: text("source_version").notNull(),
  sha256: text("sha256").notNull(),
  importedBy: text("imported_by"),
  status: text("status").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  linkedRows: integer("linked_rows").notNull().default(0),
  unmatchedRows: integer("unmatched_rows").notNull().default(0),
  errorsJson: text("errors_json"),
  ...timestamps,
}, (table) => [uniqueIndex("imports_source_hash_idx").on(table.source, table.sha256)]);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  reviewerUserId: text("reviewer_user_id").notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const userRoles = sqliteTable("user_roles", {
  userId: text("user_id").primaryKey(),
  role: text("role", { enum: ["technician", "reviewer", "admin"] }).notNull(),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});
