import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const observationId = form.get("observationId");
  if (!(file instanceof File) || typeof observationId !== "string") {
    return NextResponse.json({ error: "Archivo y observationId son obligatorios" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Solo imágenes de hasta 12 MB" }, { status: 415 });
  }
  const key = `private/observations/${observationId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const binding = (env as unknown as { EVIDENCE?: R2Bucket }).EVIDENCE;
    if (!binding) throw new Error("R2 no disponible");
    await binding.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { observationId, publication: "private" },
    });
    return NextResponse.json({ data: { key, visibility: "private", persisted: true } }, { status: 201 });
  } catch {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "No fue posible almacenar la evidencia" }, { status: 503 });
    }
    return NextResponse.json({ data: { key, visibility: "private", persisted: false } }, { status: 202 });
  }
}
