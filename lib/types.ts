export type Surface = "asfalto" | "concreto" | "afirmado" | "tierra";

export type Intervention =
  | "mantenimiento_rutinario"
  | "mantenimiento_periodico"
  | "rehabilitacion"
  | "reconstruccion"
  | "mejoramiento"
  | "nuevo_trazo";

export type ReviewStatus =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "publicado";

export type ConfidenceBand = "alta" | "media" | "baja";

export type SegmentKind = "urbano" | "rural";

export interface RoadSegment {
  id: string;
  roadId: string;
  code: string;
  roadName: string;
  ubigeo: string;
  district: string;
  kind: SegmentKind;
  surface: Surface;
  lengthM: number;
  coordinates: [number, number][];
  conditionScore: number;
  connectivityScore: number;
  hazardScore: number;
  priorityScore: number;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  intervention: Intervention;
  status: ReviewStatus;
  responsibleAuthority: string;
  observationCount: number;
  lastObservedAt: string;
  source: string;
  sourceGeometryId: string;
  geometryQuality: "map_matched" | "surveyed" | "approximate";
  reason: string;
}

export interface AdministrativeArea {
  ubigeo: string;
  name: string;
  level: "department" | "province" | "district";
  parentUbigeo: string | null;
}

export interface ScoreInput {
  kind: SegmentKind;
  condition: number;
  connectivity: number;
  hazard: number;
}

export interface ConfidenceInput {
  coverage: number;
  recency: number;
  quality: number;
  agreement: number;
}
