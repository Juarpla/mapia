import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { persistObservation } from "@/lib/server/repository";

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.comment !== "string" || body.comment.trim().length < 5) {
    return NextResponse.json({ error: "El comentario debe tener al menos 5 caracteres" }, { status: 400 });
  }
  const observation = {
    id: typeof body.id === "string" ? body.id : crypto.randomUUID(),
    segmentId: typeof body.segmentId === "string" ? body.segmentId : null,
    comment: body.comment.trim(),
    observedAt: typeof body.observedAt === "string" ? body.observedAt : new Date().toISOString(),
    status: "borrador",
    publication: "privada hasta revisión",
  };
  const persisted = await persistObservation({
    id: observation.id,
    segmentId: observation.segmentId,
    comment: observation.comment,
    observedAt: observation.observedAt,
    latitude: typeof body.latitude === "number" ? body.latitude : null,
    longitude: typeof body.longitude === "number" ? body.longitude : null,
    authorUserId: user?.userId ?? null,
  });
  return NextResponse.json({ data: observation, persisted }, { status: 201 });
}
