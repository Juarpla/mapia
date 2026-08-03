import { calculatePriority, confidenceBand, recommendIntervention } from "./scoring";
import type { AdministrativeArea, RoadSegment, Surface } from "./types";

export const administrativeAreas: AdministrativeArea[] = [
  { ubigeo: "01", name: "Amazonas", level: "department", parentUbigeo: null },
  { ubigeo: "02", name: "Áncash", level: "department", parentUbigeo: null },
  { ubigeo: "03", name: "Apurímac", level: "department", parentUbigeo: null },
  { ubigeo: "04", name: "Arequipa", level: "department", parentUbigeo: null },
  { ubigeo: "05", name: "Ayacucho", level: "department", parentUbigeo: null },
  { ubigeo: "06", name: "Cajamarca", level: "department", parentUbigeo: null },
  { ubigeo: "07", name: "Callao", level: "department", parentUbigeo: null },
  { ubigeo: "08", name: "Cusco", level: "department", parentUbigeo: null },
  { ubigeo: "09", name: "Huancavelica", level: "department", parentUbigeo: null },
  { ubigeo: "10", name: "Huánuco", level: "department", parentUbigeo: null },
  { ubigeo: "11", name: "Ica", level: "department", parentUbigeo: null },
  { ubigeo: "12", name: "Junín", level: "department", parentUbigeo: null },
  { ubigeo: "13", name: "La Libertad", level: "department", parentUbigeo: null },
  { ubigeo: "14", name: "Lambayeque", level: "department", parentUbigeo: null },
  { ubigeo: "15", name: "Lima", level: "department", parentUbigeo: null },
  { ubigeo: "16", name: "Loreto", level: "department", parentUbigeo: null },
  { ubigeo: "17", name: "Madre de Dios", level: "department", parentUbigeo: null },
  { ubigeo: "18", name: "Moquegua", level: "department", parentUbigeo: null },
  { ubigeo: "19", name: "Pasco", level: "department", parentUbigeo: null },
  { ubigeo: "20", name: "Piura", level: "department", parentUbigeo: null },
  { ubigeo: "21", name: "Puno", level: "department", parentUbigeo: null },
  { ubigeo: "22", name: "San Martín", level: "department", parentUbigeo: null },
  { ubigeo: "23", name: "Tacna", level: "department", parentUbigeo: null },
  { ubigeo: "24", name: "Tumbes", level: "department", parentUbigeo: null },
  { ubigeo: "25", name: "Ucayali", level: "department", parentUbigeo: null },
  { ubigeo: "1301", name: "Trujillo", level: "province", parentUbigeo: "13" },
  { ubigeo: "130101", name: "Trujillo", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130102", name: "El Porvenir", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130103", name: "Florencia de Mora", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130104", name: "Huanchaco", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130105", name: "La Esperanza", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130106", name: "Laredo", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130107", name: "Moche", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130108", name: "Poroto", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130109", name: "Salaverry", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130110", name: "Simbal", level: "district", parentUbigeo: "1301" },
  { ubigeo: "130111", name: "Víctor Larco Herrera", level: "district", parentUbigeo: "1301" },
];

const roads = [
  "Av. Larco",
  "Av. Huamán",
  "Av. Fátima",
  "Av. El Golf",
  "Av. Bolivia",
  "Av. Prolongación César Vallejo",
  "Calle Los Ángeles",
  "Av. Costa Verde",
  "Jr. Independencia",
  "Av. Víctor Larco",
];

const surfaces: Surface[] = ["asfalto", "concreto", "asfalto", "afirmado"];

export const demoSegments: RoadSegment[] = Array.from({ length: 50 }, (_, index) => {
  const row = Math.floor(index / 10);
  const column = index % 10;
  const startLng = -79.049 + column * 0.00315;
  const startLat = -8.151 + row * 0.0065 + (column % 2) * 0.00045;
  const horizontal = index % 3 !== 0;
  const condition = 28 + ((index * 17) % 68);
  const connectivity = 35 + ((index * 23) % 63);
  const hazard = 18 + ((index * 31) % 80);
  const kind = index < 44 ? "urbano" : "rural";
  const priorityScore = calculatePriority({
    kind,
    condition,
    connectivity,
    hazard,
  });
  const confidenceScore = 43 + ((index * 13) % 55);
  const intervention = recommendIntervention({
    condition,
    hazard,
    recurrentInterruptions: index === 7,
    hardToMitigate: index === 7,
    strategic: index === 7,
  });

  return {
    id: `seg-${String(index + 1).padStart(3, "0")}`,
    roadId: `road-${(index % roads.length) + 1}`,
    code: `VLH-${String(index + 1).padStart(3, "0")}`,
    roadName: roads[index % roads.length],
    ubigeo: "130111",
    district: "Víctor Larco Herrera",
    kind,
    surface: surfaces[index % surfaces.length],
    lengthM: horizontal ? 175 + (index % 4) * 8 : 192 + (index % 3) * 11,
    coordinates: horizontal
      ? [
          [startLng, startLat],
          [startLng + 0.00245, startLat + 0.00028],
        ]
      : [
          [startLng, startLat],
          [startLng + 0.0002, startLat + 0.0021],
        ],
    conditionScore: condition,
    connectivityScore: connectivity,
    hazardScore: hazard,
    priorityScore,
    confidenceScore,
    confidenceBand: confidenceBand(confidenceScore),
    intervention,
    status: index === 48 ? "en_revision" : index === 49 ? "aprobado" : "publicado",
    responsibleAuthority:
      index % 5 === 0
        ? "Municipalidad Provincial de Trujillo"
        : "Municipalidad Distrital de Víctor Larco Herrera",
    observationCount: 1 + (index % 7),
    lastObservedAt: `2026-0${(index % 7) + 1}-${String((index % 25) + 1).padStart(2, "0")}`,
    source: index % 3 === 0 ? "Inspección MapIA + RoadLab" : index % 3 === 1 ? "MTC + OSM" : "Inspección MapIA",
    reason:
      condition >= 70
        ? "Deterioro extendido y pérdida de capacidad funcional"
        : hazard >= 65
          ? "Exposición recurrente a aniego e interrupción"
          : "Mantenimiento preventivo para evitar deterioro acelerado",
  };
});

export const publicDemoSegments = demoSegments.filter(
  (segment) => segment.status === "publicado",
);

export function segmentFeatureCollection(segments: RoadSegment[]) {
  return {
    type: "FeatureCollection" as const,
    features: segments.map((segment) => ({
      type: "Feature" as const,
      id: segment.id,
      geometry: { type: "LineString" as const, coordinates: segment.coordinates },
      properties: {
        id: segment.id,
        priority: segment.priorityScore,
        confidence: segment.confidenceScore,
        intervention: segment.intervention,
        status: segment.status,
      },
    })),
  };
}
