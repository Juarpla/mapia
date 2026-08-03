import { NextRequest, NextResponse } from "next/server";
import { publicDemoSegments } from "@/lib/demo-data";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const segment = publicDemoSegments.find((item) => item.id === id);
  if (!segment) return NextResponse.json({ error: "Tramo no encontrado o no publicado" }, { status: 404 });
  return NextResponse.json({
    data: segment,
    history: [
      { at: segment.lastObservedAt, event: "Evidencia incorporada", source: segment.source },
      { at: "2026-01-15", event: "Prioridad calculada", modelVersion: "mapia-urban-v1" },
      { at: "2026-01-18", event: "Revisión aprobada y publicada" },
    ],
  });
}
