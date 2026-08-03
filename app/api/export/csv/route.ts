import { NextResponse } from "next/server";
import { publicDemoSegments } from "@/lib/demo-data";

export async function GET() {
  const header = "id,codigo,via,ubigeo,prioridad,confianza,intervencion,estado,actualizado";
  const rows = publicDemoSegments.map((segment) =>
    [segment.id, segment.code, `"${segment.roadName.replaceAll('"', '""')}"`, segment.ubigeo, segment.priorityScore, segment.confidenceScore, segment.intervention, segment.status, segment.lastObservedAt].join(","),
  );
  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=mapia-victor-larco.csv",
    },
  });
}
