from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import mean
from typing import Sequence


@dataclass(frozen=True)
class SatelliteCandidate:
    candidate_type: str
    sensor: str
    acquired_at: str
    baseline_at: str
    change_score: float
    confidence: int
    status: str
    requires_field_inspection: bool


def normalized_change(current: Sequence[float], baseline: Sequence[float]) -> float:
    if not current or len(current) != len(baseline):
        raise ValueError("La escena y la línea base deben tener la misma cobertura")
    differences = [abs(now - before) for now, before in zip(current, baseline, strict=True)]
    denominator = max(mean(abs(value) for value in baseline), 0.01)
    return round(min(mean(differences) / denominator, 2.0), 4)


def detect_candidate(payload: dict) -> SatelliteCandidate | None:
    cloud_cover = float(payload.get("cloud_cover", 0))
    sensor = str(payload["sensor"])
    if sensor.startswith("Sentinel-2") and cloud_cover > 35:
        return None
    score = normalized_change(payload["current_corridor"], payload["baseline_corridor"])
    radar_support = bool(payload.get("radar_change_confirmed"))
    if score < 0.22 and not radar_support:
        return None
    confidence = min(92, round(42 + score * 30 + (16 if radar_support else 0) - cloud_cover * 0.2))
    return SatelliteCandidate(
        candidate_type=str(payload.get("candidate_type", "inundacion")),
        sensor=sensor,
        acquired_at=str(payload["acquired_at"]),
        baseline_at=str(payload["baseline_at"]),
        change_score=score,
        confidence=confidence,
        status="borrador",
        requires_field_inspection=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Evalúa un corredor vial con Sentinel-1/2")
    parser.add_argument("scene", type=Path)
    args = parser.parse_args()
    candidate = detect_candidate(json.loads(args.scene.read_text(encoding="utf-8")))
    print(json.dumps(asdict(candidate) if candidate else {"candidate": None}, ensure_ascii=False))


if __name__ == "__main__":
    main()
