import { readFile, writeFile } from "node:fs/promises";

const [, , inputPath, outputPath, boundaryPath] = process.argv;
if (!inputPath || !outputPath) {
  throw new Error("Uso: node scripts/generate-osm-demo.mjs <overpass.json> <salida.geojson>");
}

const bounds = {
  south: -8.165,
  west: -79.06,
  north: -8.115,
  east: -79.01,
};

const preferredRoads = [
  "Avenida Víctor Larco Herrera",
  "Avenida Huamán",
  "Avenida Fátima",
  "Avenida El Golf",
  "Avenida Prolongación César Vallejo",
  "Avenida Juan Pablo II",
  "Avenida Manuel Seoane",
  "Prolongación Avenida Bolivia",
  "Avenida América Sur",
  "Avenida José María Eguren",
  "Avenida Húsares de Junín",
  "Avenida Antenor Orrego",
];

const excludedHighways = new Set([
  "footway",
  "path",
  "pedestrian",
  "cycleway",
  "steps",
  "corridor",
  "construction",
  "proposed",
]);

const toPoint = ({ lon, lat }) => [Number(lon), Number(lat)];
const inside = ([longitude, latitude]) =>
  longitude >= bounds.west &&
  longitude <= bounds.east &&
  latitude >= bounds.south &&
  latitude <= bounds.north;

function samePoint(left, right) {
  return Math.abs(left[0] - right[0]) < 0.0000002 && Math.abs(left[1] - right[1]) < 0.0000002;
}

function assembleOuterRing(boundaryPayload) {
  const parts = (boundaryPayload.elements?.[0]?.members ?? [])
    .filter((member) => member.role === "outer" && Array.isArray(member.geometry))
    .map((member) => member.geometry.map(toPoint));
  if (!parts.length) throw new Error("El límite distrital no contiene geometría exterior");
  const ring = [...parts.shift()];
  while (parts.length) {
    const last = ring.at(-1);
    const index = parts.findIndex((part) => samePoint(part[0], last) || samePoint(part.at(-1), last));
    if (index < 0) throw new Error("No se pudo ensamblar el límite distrital");
    const [part] = parts.splice(index, 1);
    const ordered = samePoint(part[0], last) ? part : part.reverse();
    ring.push(...ordered.slice(1));
  }
  if (!samePoint(ring[0], ring.at(-1))) ring.push(ring[0]);
  return ring;
}

function pointInPolygon([longitude, latitude], ring) {
  let insidePolygon = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const intersects =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersects) insidePolygon = !insidePolygon;
  }
  return insidePolygon;
}

function distanceM([longitudeA, latitudeA], [longitudeB, latitudeB]) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusM = 6_371_000;
  const dLat = radians(latitudeB - latitudeA);
  const dLon = radians(longitudeB - longitudeA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function interpolate(start, end, ratio) {
  return [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
}

function splitGeometry(coordinates, isAllowed, maximumLengthM = 190) {
  const segments = [];
  let current = [];
  let currentLengthM = 0;

  const flush = () => {
    if (current.length >= 2 && currentLengthM >= 35) {
      segments.push({ coordinates: current, lengthM: currentLengthM });
    }
    current = [];
    currentLengthM = 0;
  };

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    let start = coordinates[index];
    const end = coordinates[index + 1];
    const midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    if (!inside(start) || !inside(end) || !isAllowed(midpoint)) {
      flush();
      continue;
    }
    if (current.length === 0) current.push(start);
    let remainingM = distanceM(start, end);

    while (currentLengthM + remainingM > maximumLengthM) {
      const neededM = maximumLengthM - currentLengthM;
      const boundary = interpolate(start, end, neededM / remainingM);
      current.push(boundary);
      currentLengthM += neededM;
      flush();
      current = [boundary];
      start = boundary;
      remainingM = distanceM(start, end);
    }

    current.push(end);
    currentLengthM += remainingM;
  }
  flush();
  return segments;
}

const payload = JSON.parse(await readFile(inputPath, "utf8"));
const districtRing = boundaryPath
  ? assembleOuterRing(JSON.parse(await readFile(boundaryPath, "utf8")))
  : null;
const isAllowed = (point) => !districtRing || pointInPolygon(point, districtRing);
const groups = new Map();

for (const element of payload.elements ?? []) {
  const name = element.tags?.name?.trim();
  const highway = element.tags?.highway;
  if (!name || !highway || excludedHighways.has(highway) || !Array.isArray(element.geometry)) continue;
  const coordinates = element.geometry.map(toPoint);
  const chunks = splitGeometry(coordinates, isAllowed);
  if (!chunks.length) continue;
  const list = groups.get(name) ?? [];
  for (const [chunkIndex, chunk] of chunks.entries()) {
    list.push({
      osmWayId: element.id,
      chunkIndex,
      highway,
      surface: element.tags?.surface ?? null,
      lanes: element.tags?.lanes ?? null,
      ...chunk,
    });
  }
  groups.set(name, list);
}

const orderedNames = [...groups.keys()].sort((left, right) => {
  const leftRank = preferredRoads.indexOf(left);
  const rightRank = preferredRoads.indexOf(right);
  if (leftRank >= 0 || rightRank >= 0) {
    return (leftRank < 0 ? preferredRoads.length : leftRank) -
      (rightRank < 0 ? preferredRoads.length : rightRank);
  }
  return left.localeCompare(right, "es");
});

const selected = [];
let round = 0;
while (selected.length < 50) {
  let added = false;
  for (const name of orderedNames) {
    const candidate = groups.get(name)?.[round];
    if (!candidate) continue;
    selected.push({ name, ...candidate });
    added = true;
    if (selected.length === 50) break;
  }
  if (!added) break;
  round += 1;
}

if (selected.length < 50) {
  throw new Error(`Solo se obtuvieron ${selected.length} segmentos viales válidos`);
}

const featureCollection = {
  type: "FeatureCollection",
  metadata: {
    source: "OpenStreetMap contributors",
    license: "ODbL 1.0",
    sourceUrl: "https://www.openstreetmap.org/copyright",
    osmDataTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
    extractionArea: "Víctor Larco Herrera y entorno inmediato",
    districtRelationId: districtRing ? 1968062 : null,
    ubigeo: districtRing ? "130111" : null,
    geometryRule: "Ejes OSM recortados a un máximo aproximado de 190 m",
  },
  features: selected.map((segment, index) => ({
    type: "Feature",
    id: `vlh-osm-${String(index + 1).padStart(3, "0")}`,
    properties: {
      name: segment.name,
      osmWayId: segment.osmWayId,
      chunkIndex: segment.chunkIndex,
      highway: segment.highway,
      surface: segment.surface,
      lanes: segment.lanes,
      lengthM: Math.round(segment.lengthM * 10) / 10,
    },
    geometry: {
      type: "LineString",
      coordinates: segment.coordinates.map(([longitude, latitude]) => [
        Math.round(longitude * 10_000_000) / 10_000_000,
        Math.round(latitude * 10_000_000) / 10_000_000,
      ]),
    },
  })),
};

await writeFile(outputPath, `${JSON.stringify(featureCollection, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    outputPath,
    segments: featureCollection.features.length,
    roads: new Set(featureCollection.features.map((feature) => feature.properties.name)).size,
    timestamp: featureCollection.metadata.osmDataTimestamp,
  }),
);
