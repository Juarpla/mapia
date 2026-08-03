import { NextRequest, NextResponse } from "next/server";
import { publicDemoSegments, segmentFeatureCollection } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const segmentId = request.nextUrl.searchParams.get("segment");
  const segments = segmentId ? publicDemoSegments.filter((item) => item.id === segmentId) : publicDemoSegments;
  return new NextResponse(JSON.stringify(segmentFeatureCollection(segments), null, 2), {
    headers: {
      "content-type": "application/geo+json; charset=utf-8",
      "content-disposition": `attachment; filename="mapia-${segmentId ?? "130111"}.geojson"`,
    },
  });
}
