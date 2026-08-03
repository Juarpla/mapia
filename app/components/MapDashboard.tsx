"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  administrativeAreas,
  publicDemoSegments,
  segmentFeatureCollection,
} from "@/lib/demo-data";
import { priorityBand } from "@/lib/scoring";
import type { Intervention, RoadSegment, Surface } from "@/lib/types";

type MapInstance = import("maplibre-gl").Map;

const interventionLabels: Record<Intervention, string> = {
  mantenimiento_rutinario: "Mantenimiento rutinario",
  mantenimiento_periodico: "Mantenimiento periódico",
  rehabilitacion: "Rehabilitación",
  reconstruccion: "Reconstrucción",
  mejoramiento: "Mejoramiento",
  nuevo_trazo: "Estudio de nuevo trazo",
};

const priorityColors = {
  critica: "#d73b31",
  alta: "#e96f24",
  media: "#e5ad28",
  baja: "#50a46d",
};

function colorForPriority(score: number) {
  return priorityColors[priorityBand(score)];
}

function formatLocalDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  const monthNames = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
  return `${day} ${monthNames[Number(month) - 1]} ${year}`;
}

function openOfflineDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("mapia-offline", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("observations")) {
        db.createObjectStore("observations", { keyPath: "id" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveOfflineObservation(observation: Record<string, unknown>) {
  if (!("indexedDB" in window)) return false;
  const db = await openOfflineDatabase();
  return new Promise<boolean>((resolve, reject) => {
      const transaction = db.transaction("observations", "readwrite");
      transaction.objectStore("observations").put(observation);
      transaction.oncomplete = () => { db.close(); resolve(true); };
      transaction.onerror = () => reject(transaction.error);
  });
}

async function syncOfflineObservations() {
  if (!("indexedDB" in window) || !navigator.onLine) return 0;
  const db = await openOfflineDatabase();
  const records = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const request = db.transaction("observations", "readonly").objectStore("observations").getAll();
    request.onsuccess = () => resolve(request.result as Array<Record<string, unknown>>);
    request.onerror = () => reject(request.error);
  });
  let synced = 0;
  for (const record of records) {
    const { photo, ...payload } = record;
    const response = await fetch("/api/observations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) continue;
    if (photo instanceof Blob) {
      const form = new FormData();
      form.set("observationId", String(record.id));
      form.set("file", photo, photo instanceof File ? photo.name : "evidence.jpg");
      const evidenceResponse = await fetch("/api/evidence", { method: "POST", body: form });
      if (!evidenceResponse.ok) continue;
    }
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction("observations", "readwrite").objectStore("observations").delete(record.id as IDBValidKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    synced += 1;
  }
  db.close();
  return synced;
}

function currentPosition(): Promise<{ latitude: number | null; longitude: number | null }> {
  if (!("geolocation" in navigator)) return Promise.resolve({ latitude: null, longitude: null });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve({ latitude: null, longitude: null }),
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
    );
  });
}

export function MapDashboard() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [department, setDepartment] = useState("13");
  const [province, setProvince] = useState("1301");
  const [district, setDistrict] = useState("130111");
  const [minimumPriority, setMinimumPriority] = useState(0);
  const [confidence, setConfidence] = useState("todas");
  const [surface, setSurface] = useState<Surface | "todas">("todas");
  const [intervention, setIntervention] = useState<Intervention | "todas">("todas");
  const [selectedId, setSelectedId] = useState<string | null>("seg-008");
  const [showLayers, setShowLayers] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const departments = administrativeAreas.filter((area) => area.level === "department");
  const provinces = administrativeAreas.filter(
    (area) => area.level === "province" && area.parentUbigeo === department,
  );
  const districts = administrativeAreas.filter(
    (area) => area.level === "district" && area.parentUbigeo === province,
  );

  const filteredSegments = useMemo(
    () =>
      publicDemoSegments.filter(
        (segment) =>
          segment.ubigeo === district &&
          segment.priorityScore >= minimumPriority &&
          (confidence === "todas" || segment.confidenceBand === confidence) &&
          (surface === "todas" || segment.surface === surface) &&
          (intervention === "todas" || segment.intervention === intervention),
      ),
    [confidence, district, intervention, minimumPriority, surface],
  );

  const selectedSegment = selectedId === null
    ? undefined
    : filteredSegments.find((segment) => segment.id === selectedId) ?? filteredSegments[0];

  useEffect(() => {
    const sync = async () => {
      const count = await syncOfflineObservations();
      if (count > 0) {
        setToast(`${count} evidencia${count > 1 ? "s" : ""} sincronizada${count > 1 ? "s" : ""}.`);
        window.setTimeout(() => setToast(""), 4200);
      }
    };
    window.addEventListener("online", sync);
    if (navigator.onLine) void sync();
    return () => window.removeEventListener("online", sync);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;

    async function createMap() {
      const maplibre = await import("maplibre-gl");
      if (cancelled || !mapContainerRef.current) return;

      const pmtilesUrl = process.env.NEXT_PUBLIC_PMTILES_URL;
      if (pmtilesUrl) {
        const { Protocol } = await import("pmtiles");
        const protocol = new Protocol();
        maplibre.addProtocol("pmtiles", protocol.tile);
      }

      const baseStyle: import("maplibre-gl").StyleSpecification = pmtilesUrl
        ? {
            version: 8,
            sources: {
              basemap: { type: "vector", url: `pmtiles://${pmtilesUrl}` },
            },
            layers: [
              { id: "background", type: "background", paint: { "background-color": "#e8eee9" } },
              {
                id: "roads-base",
                type: "line",
                source: "basemap",
                "source-layer": "transportation",
                paint: { "line-color": "#c3cbc4", "line-width": 1.2 },
              },
            ],
          }
        : {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          };

      const map = new maplibre.Map({
        container: mapContainerRef.current,
        style: baseStyle,
        center: [-79.032, -8.139],
        zoom: 13.25,
        maxZoom: 19,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");

      map.on("load", () => {
        map.addSource("road-segments", {
          type: "geojson",
          data: segmentFeatureCollection(filteredSegments),
          lineMetrics: true,
        });
        map.addLayer({
          id: "road-segments-shadow",
          type: "line",
          source: "road-segments",
          paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.8 },
        });
        map.addLayer({
          id: "road-segments",
          type: "line",
          source: "road-segments",
          paint: {
            "line-color": [
              "step",
              ["get", "priority"],
              priorityColors.baja,
              45,
              priorityColors.media,
              65,
              priorityColors.alta,
              80,
              priorityColors.critica,
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 11, 4, 16, 8],
            "line-opacity": 0.95,
          },
        });
        map.on("click", "road-segments", (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id) setSelectedId(String(id));
        });
        map.on("mouseenter", "road-segments", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "road-segments", () => {
          map.getCanvas().style.cursor = "";
        });
        setMapReady(true);
      });
    }

    void createMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is initialized once; source updates are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const source = mapRef.current.getSource("road-segments") as
      | import("maplibre-gl").GeoJSONSource
      | undefined;
    source?.setData(segmentFeatureCollection(filteredSegments));
  }, [filteredSegments, mapReady]);

  function resetFilters() {
    setMinimumPriority(0);
    setConfidence("todas");
    setSurface("todas");
    setIntervention("todas");
  }

  async function captureObservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const position = await currentPosition();
    const observation = {
      id: crypto.randomUUID(),
      segmentId: selectedSegment?.id ?? null,
      comment,
      observedAt: new Date().toISOString(),
      latitude: position.latitude,
      longitude: position.longitude,
      status: "borrador",
      syncStatus: navigator.onLine ? "pendiente" : "sin_conexion",
      photo,
    };
    await saveOfflineObservation(observation);
    setComment("");
    setPhoto(null);
    setShowCapture(false);
    const synced = await syncOfflineObservations();
    setToast(synced > 0 ? "Evidencia guardada y sincronizada como borrador privado." : "Evidencia guardada en el dispositivo. Se sincronizará con conexión.");
    window.setTimeout(() => setToast(""), 4200);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">M</div>
          <div>
            <div className="brand-name">MapIA</div>
            <div className="brand-subtitle">Inteligencia para mejores vías</div>
          </div>
        </div>

        <div className="territory-selectors" aria-label="Selección territorial">
          <label>
            <span>Departamento</span>
            <select
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setProvince("");
                setDistrict("");
              }}
            >
              {departments.map((area) => <option key={area.ubigeo} value={area.ubigeo}>{area.name}</option>)}
            </select>
          </label>
          <span className="selector-chevron">›</span>
          <label>
            <span>Provincia</span>
            <select value={province} onChange={(event) => { setProvince(event.target.value); setDistrict(""); }}>
              {provinces.length ? provinces.map((area) => <option key={area.ubigeo} value={area.ubigeo}>{area.name}</option>) : <option value="">Sin demo cargado</option>}
            </select>
          </label>
          <span className="selector-chevron">›</span>
          <label>
            <span>Distrito</span>
            <select value={district} onChange={(event) => setDistrict(event.target.value)}>
              {districts.length ? districts.map((area) => <option key={area.ubigeo} value={area.ubigeo}>{area.name}</option>) : <option value="">Sin demo cargado</option>}
            </select>
          </label>
        </div>

        <nav className="top-actions" aria-label="Acciones principales">
          <button className="icon-button" type="button" aria-label="Información del proyecto">i</button>
          <Link className="technical-link" href="/tecnico"><span aria-hidden="true">▦</span> Panel técnico</Link>
        </nav>
      </header>

      <section className="workspace">
        <aside className={`filters-panel ${showFilters ? "filters-open" : ""}`} aria-label="Filtros del mapa">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Explorar tramos</span>
              <h1>¿Dónde intervenir primero?</h1>
            </div>
            <button type="button" className="mobile-close" onClick={() => setShowFilters(false)} aria-label="Cerrar filtros">×</button>
          </div>
          <p className="panel-copy">Prioridad estimada con condición, conectividad y riesgos. La confianza se informa por separado.</p>

          <div className="metric-strip">
            <div><strong>{filteredSegments.length}</strong><span>tramos</span></div>
            <div><strong>{filteredSegments.filter((item) => item.priorityScore >= 65).length}</strong><span>alta prioridad</span></div>
            <div><strong>29 mar.</strong><span>último evento</span></div>
          </div>

          <div className="filter-section">
            <div className="filter-title"><span>Prioridad mínima</span><output>{minimumPriority || "Todas"}</output></div>
            <input
              className="range-input"
              type="range"
              min="0"
              max="85"
              step="5"
              value={minimumPriority}
              onChange={(event) => setMinimumPriority(Number(event.target.value))}
              aria-label="Prioridad mínima"
            />
            <div className="priority-scale"><span>Baja</span><span>Media</span><span>Alta</span><span>Crítica</span></div>
          </div>

          <div className="filter-section two-columns">
            <label><span>Confianza</span><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="todas">Todas</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></label>
            <label><span>Superficie</span><select value={surface} onChange={(event) => setSurface(event.target.value as Surface | "todas")}><option value="todas">Todas</option><option value="asfalto">Asfalto</option><option value="concreto">Concreto</option><option value="afirmado">Afirmado</option><option value="tierra">Tierra</option></select></label>
          </div>

          <div className="filter-section">
            <label><span>Intervención sugerida</span><select value={intervention} onChange={(event) => setIntervention(event.target.value as Intervention | "todas")}><option value="todas">Todas las intervenciones</option>{Object.entries(interventionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          <div className="filter-section source-checks">
            <span>Capas de evidencia</span>
            <label><input type="checkbox" defaultChecked /> Inspecciones técnicas <small>37</small></label>
            <label><input type="checkbox" defaultChecked /> Riesgo de inundación <small>8</small></label>
            <label><input type="checkbox" defaultChecked /> Red vial MTC / OSM <small>50</small></label>
          </div>

          <button className="reset-button" type="button" onClick={resetFilters}>Restablecer filtros</button>
          <div className="decision-note"><span aria-hidden="true">✓</span><p><strong>Recomendación, no autorización</strong>Todo tramo publicado fue revisado. La decisión final corresponde a la entidad vial.</p></div>
        </aside>

        <div className="map-stage">
          <div ref={mapContainerRef} className="map-container" aria-label="Mapa de tramos priorizados en Víctor Larco Herrera" />
          {!mapReady && <div className="map-loading" role="status"><span />Preparando mapa vial…</div>}

          <div className="map-toolbar">
            <button type="button" onClick={() => setShowLayers((value) => !value)} aria-expanded={showLayers}><span aria-hidden="true">▱</span> Capas</button>
            <button type="button" onClick={() => setShowFilters(true)} className="mobile-filter-button"><span aria-hidden="true">≡</span> Filtros</button>
            <button type="button" onClick={() => setShowCapture(true)}><span aria-hidden="true">＋</span> Reportar</button>
          </div>

          {showLayers && (
            <div className="layers-popover">
              <strong>Capas visibles</strong>
              <label><input type="checkbox" defaultChecked /> Prioridad por tramo</label>
              <label><input type="checkbox" defaultChecked /> Mapa base</label>
              <label><input type="checkbox" /> Candidatos satelitales</label>
              <small>Base PMTiles al configurar NEXT_PUBLIC_PMTILES_URL.</small>
            </div>
          )}

          <div className="legend">
            <span>Prioridad</span>
            {Object.entries(priorityColors).map(([label, color]) => <div key={label}><i style={{ background: color }} />{label}</div>)}
          </div>

          {selectedSegment && (
            <SegmentCard
              segment={selectedSegment}
              onClose={() => setSelectedId(null)}
              onReport={() => setShowCapture(true)}
            />
          )}
        </div>
      </section>

      {showCapture && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowCapture(false)}>
          <form className="capture-modal" onSubmit={captureObservation} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><span className="eyebrow">Evidencia de campo</span><h2>Reportar condición vial</h2></div><button type="button" onClick={() => setShowCapture(false)} aria-label="Cerrar">×</button></div>
            <p>La evidencia queda como borrador privado hasta que un técnico y un revisor la validen.</p>
            <label><span>Tramo</span><input value={selectedSegment ? `${selectedSegment.code} · ${selectedSegment.roadName}` : "Sin tramo vinculado"} readOnly /></label>
            <label className="photo-drop"><span aria-hidden="true">▣</span><strong>{photo ? photo.name : "Tomar o adjuntar fotografía"}</strong><small>JPG/PNG · se conserva el original privado</small><input type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>
            <label><span>Comentario técnico</span><textarea required value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Describe baches, fisuras, drenaje, interrupción u otra evidencia…" /></label>
            <div className="gps-row"><span aria-hidden="true">⌖</span><div><strong>Ubicación del dispositivo</strong><small>Se solicitará GPS al guardar</small></div><span className="offline-pill">Disponible sin conexión</span></div>
            <button className="primary-button" type="submit">Guardar evidencia</button>
          </form>
        </div>
      )}

      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}

function SegmentCard({ segment, onClose, onReport }: { segment: RoadSegment; onClose: () => void; onReport: () => void }) {
  const band = priorityBand(segment.priorityScore);
  return (
    <article className="segment-card">
      <button className="card-close" type="button" onClick={onClose} aria-label="Cerrar detalle">×</button>
      <div className="segment-card-top">
        <div className="score-ring" style={{ "--score-color": colorForPriority(segment.priorityScore) } as React.CSSProperties}><strong>{segment.priorityScore}</strong><span>/ 100</span></div>
        <div><span className={`priority-badge priority-${band}`}>{band === "critica" ? "Prioridad crítica" : `Prioridad ${band}`}</span><h2>{segment.roadName}</h2><p>{segment.code} · {segment.lengthM} m · {segment.surface}</p></div>
      </div>
      <div className="card-recommendation"><span aria-hidden="true">↗</span><div><small>Intervención sugerida</small><strong>{interventionLabels[segment.intervention]}</strong></div></div>
      <p className="reason-copy">{segment.reason}</p>
      <div className="score-breakdown">
        <div><span>Condición</span><strong>{segment.conditionScore}</strong><i><b style={{ width: `${segment.conditionScore}%` }} /></i></div>
        <div><span>Conectividad</span><strong>{segment.connectivityScore}</strong><i><b style={{ width: `${segment.connectivityScore}%` }} /></i></div>
        <div><span>Riesgos</span><strong>{segment.hazardScore}</strong><i><b style={{ width: `${segment.hazardScore}%` }} /></i></div>
      </div>
      <div className="confidence-row"><span className={`confidence-dot ${segment.confidenceBand}`} /> <strong>Confianza {segment.confidenceBand}</strong><span>{segment.confidenceScore}% · {segment.observationCount} evidencias</span></div>
      <div className="card-meta"><span>Actualizado {formatLocalDate(segment.lastObservedAt)}</span><span>Fuente: {segment.source}</span></div>
      <div className="card-actions"><button type="button" onClick={onReport}>＋ Añadir evidencia</button><Link href={`/api/export/geojson?segment=${segment.id}`}>Descargar GeoJSON</Link></div>
    </article>
  );
}
