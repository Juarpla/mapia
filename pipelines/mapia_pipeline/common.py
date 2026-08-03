from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


@dataclass(frozen=True)
class Provenance:
    source: str
    license: str | None
    source_version: str
    observed_at: str | None
    imported_at: str
    sha256: str


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def provenance(
    path: Path,
    *,
    source: str,
    license_name: str | None,
    source_version: str,
    observed_at: str | None = None,
) -> Provenance:
    return Provenance(
        source=source,
        license=license_name,
        source_version=source_version,
        observed_at=observed_at,
        imported_at=datetime.now(UTC).isoformat(),
        sha256=file_sha256(path),
    )


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


def with_provenance(record: dict[str, Any], metadata: Provenance) -> dict[str, Any]:
    return {**record, "provenance": asdict(metadata)}
