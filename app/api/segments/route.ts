import { NextRequest, NextResponse } from "next/server";
import { publicDemoSegments } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const ubigeo = request.nextUrl.searchParams.get("ubigeo") ?? "130111";
  const minimumPriority = Number(request.nextUrl.searchParams.get("priority_min") ?? 0);
  const data = publicDemoSegments.filter(
    (segment) => segment.ubigeo === ubigeo && segment.priorityScore >= minimumPriority,
  );
  return NextResponse.json({
    data,
    meta: { ubigeo, count: data.length, publicationRule: "status = publicado" },
  });
}
