import { NextRequest, NextResponse } from "next/server";
import { administrativeAreas } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level");
  const parent = request.nextUrl.searchParams.get("parent");
  const data = administrativeAreas.filter(
    (area) => (!level || area.level === level) && (!parent || area.parentUbigeo === parent),
  );
  return NextResponse.json({ data, source: "INEI (estructura demo; importador completo disponible)" });
}
