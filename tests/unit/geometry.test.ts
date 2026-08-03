import { describe, expect, it } from "vitest";
import { demoRoadNetworkMetadata, demoSegments } from "@/lib/demo-data";
import roadNetwork from "@/lib/victor-larco-road-segments.json";

describe("geometría vial del piloto", () => {
  it("usa 50 tramos OSM dentro del distrito 130111", () => {
    expect(demoRoadNetworkMetadata.ubigeo).toBe("130111");
    expect(demoRoadNetworkMetadata.license).toBe("ODbL 1.0");
    expect(roadNetwork.features).toHaveLength(50);
    expect(new Set(roadNetwork.features.map((feature) => feature.id)).size).toBe(50);
  });

  it("conserva los vértices exactos de la red fuente", () => {
    for (const [index, segment] of demoSegments.entries()) {
      const source = roadNetwork.features[index];
      expect(segment.geometryQuality).toBe("map_matched");
      expect(segment.sourceGeometryId).toBe(`osm-way-${source.properties.osmWayId}`);
      expect(segment.coordinates).toEqual(source.geometry.coordinates);
      expect(source.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(source.properties.lengthM).toBeGreaterThanOrEqual(35);
      expect(source.properties.lengthM).toBeLessThanOrEqual(190.1);
    }
  });

  it("no vuelve a crear líneas aleatorias entre coordenadas", () => {
    expect(demoSegments.every((segment) => segment.source.includes("OpenStreetMap"))).toBe(true);
    expect(demoSegments.some((segment) => segment.coordinates.length > 2)).toBe(true);
  });
});
