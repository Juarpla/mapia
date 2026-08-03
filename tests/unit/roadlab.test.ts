import { describe, expect, it } from "vitest";
import { demoSegments } from "@/lib/demo-data";
import { matchRoadLabRows, parseRoadLabCsv } from "@/lib/roadlab";

const csv = `external_id,latitude,longitude,condition,observed_at
RL-001,-8.14995,-79.04890,82,2026-07-20
RL-002,-8.00000,-79.00000,55,2026-07-21`;

describe("importación RoadLab", () => {
  it("valida y normaliza el CSV", () => {
    const rows = parseRoadLabCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].condition).toBe(82);
  });

  it("vincula observaciones cercanas y conserva las no vinculadas", () => {
    const matches = matchRoadLabRows(parseRoadLabCsv(csv), demoSegments, 45);
    expect(matches[0].status).toBe("linked");
    expect(matches[0].segmentId).toBeTruthy();
    expect(matches[1].status).toBe("unmatched");
    expect(matches[1].segmentId).toBeNull();
  });

  it("rechaza campos obligatorios ausentes", () => {
    expect(() => parseRoadLabCsv("latitude,longitude\n-8,-79")).toThrow(/external_id/);
  });
});
