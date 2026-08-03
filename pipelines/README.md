# Procesos de datos de MapIA

Estos procesos trabajan únicamente con descargas oficiales o APIs documentadas. Si un visor no ofrece una API autorizada, se exporta manualmente GeoJSON/CSV y se conserva su huella SHA-256, licencia, versión y fechas.

```bash
cd pipelines
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev,geo]'

python -m mapia_pipeline.import_sources inei limites_inei.geojson out/inei.jsonl --version 2026-06
python -m mapia_pipeline.import_sources mtc red_vial_mtc.geojson out/mtc.jsonl --version 2026-07
python -m mapia_pipeline.satellite fixtures/satellite_event_2025-03-29.json
pytest
```

La salida normalizada se carga mediante `UPSERT` usando `(source, external_id, source_version)` para conservar idempotencia. Los candidatos satelitales siempre nacen como `borrador`: no son daños confirmados ni autorizaciones de obra.
