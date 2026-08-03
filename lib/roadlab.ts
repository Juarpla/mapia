import type { RoadSegment } from "./types";

export interface RoadLabRow {
  externalId: string;
  latitude: number;
  longitude: number;
  condition: number;
  observedAt: string;
}

export interface RoadLabMatch extends RoadLabRow {
  segmentId: string | null;
  distanceM: number | null;
  status: "linked" | "unmatched";
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      result.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  result.push(value.trim());
  return result;
}

export function parseRoadLabCsv(csv: string): RoadLabRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("El CSV no contiene observaciones");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const required = ["external_id", "latitude", "longitude", "condition", "observed_at"];
  for (const field of required) {
    if (!headers.includes(field)) throw new Error(`Falta la columna obligatoria: ${field}`);
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const get = (name: string) => values[headers.indexOf(name)] ?? "";
    const latitude = Number(get("latitude"));
    const longitude = Number(get("longitude"));
    const condition = Number(get("condition"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(condition)) {
      throw new Error(`Fila ${rowIndex + 2}: coordenadas o condición inválidas`);
    }
    if (condition < 0 || condition > 100) {
      throw new Error(`Fila ${rowIndex + 2}: condition debe estar entre 0 y 100`);
    }
    return {
      externalId: get("external_id"),
      latitude,
      longitude,
      condition,
      observedAt: get("observed_at"),
    };
  });
}

function haversineM(a: [number, number], b: [number, number]) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function pointToSegmentDistanceM(
  point: [number, number],
  start: [number, number],
  end: [number, number],
) {
  const latitudeReference = ((point[1] + start[1] + end[1]) / 3) * (Math.PI / 180);
  const longitudeScale = 111_320 * Math.cos(latitudeReference);
  const latitudeScale = 110_540;
  const px = point[0] * longitudeScale;
  const py = point[1] * latitudeScale;
  const ax = start[0] * longitudeScale;
  const ay = start[1] * latitudeScale;
  const bx = end[0] * longitudeScale;
  const by = end[1] * latitudeScale;
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;
  if (denominator === 0) return haversineM(point, start);
  const ratio = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator));
  return Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy));
}

export function matchRoadLabRows(
  rows: RoadLabRow[],
  segments: RoadSegment[],
  thresholdM = 35,
): RoadLabMatch[] {
  return rows.map((row) => {
    let best: { id: string; distanceM: number } | null = null;
    for (const segment of segments) {
      for (let index = 0; index < segment.coordinates.length - 1; index += 1) {
        const start = segment.coordinates[index];
        const end = segment.coordinates[index + 1];
        const distanceM = pointToSegmentDistanceM(
          [row.longitude, row.latitude],
          start,
          end,
        );
        if (!best || distanceM < best.distanceM) best = { id: segment.id, distanceM };
      }
    }
    if (!best || best.distanceM > thresholdM) {
      return {
        ...row,
        segmentId: null,
        distanceM: best ? Math.round(best.distanceM * 10) / 10 : null,
        status: "unmatched" as const,
      };
    }
    return {
      ...row,
      segmentId: best.id,
      distanceM: Math.round(best.distanceM * 10) / 10,
      status: "linked" as const,
    };
  });
}
