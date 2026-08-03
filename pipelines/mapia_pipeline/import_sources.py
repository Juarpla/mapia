from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Callable, Iterable

from .common import provenance, with_provenance, write_jsonl


SOURCE_DEFAULTS = {
    "inei": {"license": "Según términos de uso de INEI", "entity": "administrative_areas"},
    "mtc": {"license": "Datos abiertos del Estado Peruano", "entity": "roads"},
    "osm": {"license": "ODbL 1.0", "entity": "roads"},
    "cenepred": {"license": "Según ficha del conjunto", "entity": "hazard_events"},
    "ingemmet": {"license": "Según ficha del conjunto", "entity": "hazard_events"},
    "indeci": {"license": "Según ficha del conjunto", "entity": "hazard_events"},
    "senamhi": {"license": "Según ficha del conjunto", "entity": "hazard_events"},
}


def feature_records(payload: dict[str, Any]) -> Iterable[dict[str, Any]]:
    if payload.get("type") != "FeatureCollection":
        raise ValueError("Se esperaba un GeoJSON FeatureCollection")
    for feature in payload.get("features", []):
        properties = feature.get("properties") or {}
        yield {
            "external_id": str(
                properties.get("id")
                or properties.get("ubigeo")
                or properties.get("codigo")
                or ""
            ),
            "name": properties.get("name") or properties.get("nombre"),
            "properties": properties,
            "geometry": feature.get("geometry"),
        }


def csv_records(path: Path) -> Iterable[dict[str, Any]]:
    with path.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            yield {"external_id": row.get("id") or row.get("ubigeo") or row.get("codigo"), "properties": row}


def normalize(
    input_path: Path,
    *,
    source: str,
    version: str,
    license_name: str | None,
) -> list[dict[str, Any]]:
    metadata = provenance(
        input_path,
        source=source.upper(),
        license_name=license_name,
        source_version=version,
    )
    loader: Callable[[], Iterable[dict[str, Any]]]
    if input_path.suffix.lower() in {".geojson", ".json"}:
        loader = lambda: feature_records(json.loads(input_path.read_text(encoding="utf-8")))
    elif input_path.suffix.lower() == ".csv":
        loader = lambda: csv_records(input_path)
    else:
        raise ValueError("Formato no admitido. Use GeoJSON o CSV exportado oficialmente.")

    unique: dict[str, dict[str, Any]] = {}
    for index, record in enumerate(loader()):
        external_id = str(record.get("external_id") or f"row-{index}")
        unique[external_id] = with_provenance({**record, "external_id": external_id}, metadata)
    return list(unique.values())


def main() -> None:
    parser = argparse.ArgumentParser(description="Normaliza una descarga oficial para MapIA")
    parser.add_argument("source", choices=SOURCE_DEFAULTS)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--version", required=True, help="Versión o fecha de corte de la fuente")
    parser.add_argument("--license", dest="license_name")
    args = parser.parse_args()
    defaults = SOURCE_DEFAULTS[args.source]
    records = normalize(
        args.input,
        source=args.source,
        version=args.version,
        license_name=args.license_name or str(defaults["license"]),
    )
    write_jsonl(args.output, records)
    print(json.dumps({"source": args.source, "entity": defaults["entity"], "records": len(records)}))


if __name__ == "__main__":
    main()
