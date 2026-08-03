"use client";

import Link from "next/link";
import { useState } from "react";
import type { RoadSegment } from "@/lib/types";

export function TechnicalDashboard({ userDisplay, initialQueue }: { userDisplay: string; initialQueue: RoadSegment[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [importResult, setImportResult] = useState("");
  const [busyId, setBusyId] = useState("");

  async function review(segment: RoadSegment, toStatus: "aprobado" | "rechazado" | "publicado") {
    setBusyId(segment.id);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entityId: segment.id,
        fromStatus: segment.status,
        toStatus,
        comment: "Revisión desde el panel técnico",
      }),
    });
    if (response.ok) {
      setQueue((current) => current.map((item) => item.id === segment.id ? { ...item, status: toStatus } : item));
    }
    setBusyId("");
  }

  async function importRoadLab(file: File) {
    setImportResult("Validando archivo…");
    const response = await fetch("/api/imports/roadlab", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: await file.text(),
    });
    const result = await response.json() as { import?: { linkedRows: number; unmatchedRows: number }; error?: string };
    setImportResult(result.error ?? `${result.import?.linkedRows ?? 0} filas vinculadas · ${result.import?.unmatchedRows ?? 0} sin vincular`);
  }

  return (
    <main className="technical-page">
      <header className="technical-header">
        <div className="brand-block"><div className="brand-mark">M</div><div><div className="brand-name">MapIA</div><div className="brand-subtitle">Panel de revisión</div></div></div>
        <nav><Link href="/">Mapa público</Link><a href="/api/export/csv">Exportar CSV</a><span>{userDisplay}</span></nav>
      </header>

      <div className="technical-content">
        <section className="technical-intro">
          <div><span className="eyebrow">Bandeja técnica</span><h1>Decisiones con evidencia trazable</h1><p>El algoritmo recomienda. Tú verificas la evidencia, ajustas criterios y dejas constancia antes de publicar.</p></div>
          <label className="import-button">↑ Importar RoadLab<input type="file" accept=".csv,text/csv" onChange={(event) => event.target.files?.[0] && void importRoadLab(event.target.files[0])} /></label>
        </section>
        {importResult && <div className="import-result" role="status">{importResult}</div>}

        <section className="technical-metrics">
          <div><small>En revisión</small><strong>{queue.filter((item) => item.status === "en_revision").length}</strong><span>requieren decisión</span></div>
          <div><small>Aprobados</small><strong>{queue.filter((item) => item.status === "aprobado").length}</strong><span>listos para publicar</span></div>
          <div><small>Candidatos satelitales</small><strong>3</strong><span>Sentinel-1/2</span></div>
          <div><small>Confianza media</small><strong>76%</strong><span>piloto 130111</span></div>
        </section>

        <div className="technical-grid">
          <section className="review-queue">
            <div className="section-title"><div><span className="eyebrow">Cola de revisión</span><h2>Tramos pendientes</h2></div><span>{queue.length} resultados</span></div>
            {queue.map((segment) => (
              <article className="review-row" key={segment.id}>
                <div className="review-score"><strong>{segment.priorityScore}</strong><span>prioridad</span></div>
                <div className="review-main"><strong>{segment.roadName}</strong><span>{segment.code} · {segment.lengthM} m · {segment.surface}</span><p>{segment.reason}</p></div>
                <div className="review-confidence"><small>Confianza</small><strong>{segment.confidenceScore}%</strong><span className={`status-tag status-${segment.status}`}>{segment.status.replace("_", " ")}</span></div>
                <div className="review-actions">
                  {segment.status === "en_revision" && <><button disabled={busyId === segment.id} onClick={() => void review(segment, "rechazado")}>Rechazar</button><button className="approve" disabled={busyId === segment.id} onClick={() => void review(segment, "aprobado")}>Aprobar</button></>}
                  {segment.status === "aprobado" && <button className="publish" disabled={busyId === segment.id} onClick={() => void review(segment, "publicado")}>Publicar</button>}
                  {segment.status === "publicado" && <span>Publicado</span>}
                </div>
              </article>
            ))}
          </section>

          <aside className="satellite-panel">
            <div className="section-title"><div><span className="eyebrow">Monitoreo</span><h2>Señales satelitales</h2></div></div>
            <div className="satellite-scene"><div className="scene-placeholder"><span>Sentinel-1</span><strong>29 MAR 2025</strong></div><span className="candidate-tag">Candidato no publicado</span><h3>Posible aniego en corredor vial</h3><p>Cambio de retrodispersión dentro del corredor de 30 m. Requiere inspección y comparación con Sentinel-2.</p><dl><div><dt>Sensor</dt><dd>S1 IW GRD</dd></div><div><dt>Confianza</dt><dd>68%</dd></div><div><dt>Área</dt><dd>1.7 ha</dd></div></dl><button>Asignar inspección</button></div>
            <div className="audit-note"><strong>Registro auditable</strong><p>Cada cambio conserva autor, fecha, estado anterior, comentario y versión del modelo.</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
