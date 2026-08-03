import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { demoSegments } from "@/lib/demo-data";
import { matchRoadLabRows, parseRoadLabCsv } from "@/lib/roadlab";
import { persistImport } from "@/lib/server/repository";

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 });
  }
  const csv = await request.text();
  try {
    const bytes = new TextEncoder().encode(csv);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const rows = parseRoadLabCsv(csv);
    const matches = matchRoadLabRows(rows, demoSegments);
    const importId = crypto.randomUUID();
    const linkedRows = matches.filter((row) => row.status === "linked").length;
    const unmatchedRows = matches.filter((row) => row.status === "unmatched").length;
    const persisted = await persistImport({
      id: importId,
      sha256,
      totalRows: matches.length,
      linkedRows,
      unmatchedRows,
      importedBy: user?.userId,
    });
    return NextResponse.json({
      import: {
        id: importId,
        sha256,
        idempotencyKey: `roadlab:${sha256}`,
        totalRows: matches.length,
        linkedRows,
        unmatchedRows,
        status: "validado",
        persisted,
      },
      rows: matches,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV inválido" }, { status: 400 });
  }
}
