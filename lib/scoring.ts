import type {
  ConfidenceBand,
  ConfidenceInput,
  Intervention,
  ScoreInput,
} from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function calculatePriority(input: ScoreInput): number {
  const condition = clamp(input.condition);
  const connectivity = clamp(input.connectivity);
  const hazard = clamp(input.hazard);
  const weights =
    input.kind === "urbano"
      ? { condition: 0.55, connectivity: 0.25, hazard: 0.2 }
      : { condition: 0.4, connectivity: 0.25, hazard: 0.35 };

  return Math.round(
    condition * weights.condition +
      connectivity * weights.connectivity +
      hazard * weights.hazard,
  );
}

export function calculateConfidence(input: ConfidenceInput): number {
  return Math.round(
    clamp(input.coverage) * 0.3 +
      clamp(input.recency) * 0.25 +
      clamp(input.quality) * 0.25 +
      clamp(input.agreement) * 0.2,
  );
}

export function confidenceBand(score: number): ConfidenceBand {
  if (score >= 75) return "alta";
  if (score >= 50) return "media";
  return "baja";
}

export function recommendIntervention(input: {
  condition: number;
  hazard: number;
  recurrentInterruptions?: boolean;
  hardToMitigate?: boolean;
  strategic?: boolean;
}): Intervention {
  if (
    input.hazard >= 85 &&
    input.recurrentInterruptions &&
    input.hardToMitigate &&
    input.strategic
  ) {
    return "nuevo_trazo";
  }
  if (input.condition >= 85) return "reconstruccion";
  if (input.condition >= 68) return "rehabilitacion";
  if (input.condition >= 50) return "mejoramiento";
  if (input.condition >= 30) return "mantenimiento_periodico";
  return "mantenimiento_rutinario";
}

export function priorityBand(score: number): "critica" | "alta" | "media" | "baja" {
  if (score >= 80) return "critica";
  if (score >= 65) return "alta";
  if (score >= 45) return "media";
  return "baja";
}
