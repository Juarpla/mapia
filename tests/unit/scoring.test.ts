import { describe, expect, it } from "vitest";
import {
  calculateConfidence,
  calculatePriority,
  confidenceBand,
  priorityBand,
  recommendIntervention,
} from "@/lib/scoring";

describe("priorización vial", () => {
  it("aplica pesos urbanos 55/25/20", () => {
    expect(calculatePriority({ kind: "urbano", condition: 80, connectivity: 60, hazard: 40 })).toBe(67);
  });

  it("aplica pesos rurales 40/25/35", () => {
    expect(calculatePriority({ kind: "rural", condition: 80, connectivity: 60, hazard: 40 })).toBe(61);
  });

  it("limita valores parciales fuera de rango", () => {
    expect(calculatePriority({ kind: "urbano", condition: 120, connectivity: -10, hazard: 50 })).toBe(65);
  });

  it("mantiene confianza separada de gravedad", () => {
    expect(calculateConfidence({ coverage: 100, recency: 40, quality: 80, agreement: 30 })).toBe(66);
    expect(confidenceBand(66)).toBe("media");
    expect(confidenceBand(75)).toBe("alta");
    expect(confidenceBand(49)).toBe("baja");
  });

  it("clasifica los umbrales de prioridad", () => {
    expect(priorityBand(80)).toBe("critica");
    expect(priorityBand(65)).toBe("alta");
    expect(priorityBand(45)).toBe("media");
    expect(priorityBand(44)).toBe("baja");
  });

  it("solo propone estudio de nuevo trazo cuando coinciden cuatro condiciones", () => {
    expect(recommendIntervention({ condition: 90, hazard: 90, recurrentInterruptions: true, hardToMitigate: true, strategic: true })).toBe("nuevo_trazo");
    expect(recommendIntervention({ condition: 90, hazard: 90, recurrentInterruptions: true, hardToMitigate: true, strategic: false })).toBe("reconstruccion");
  });
});
