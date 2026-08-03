import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { persistReview } from "@/lib/server/repository";

const allowedTransitions: Record<string, string[]> = {
  borrador: ["en_revision"],
  en_revision: ["aprobado", "rechazado"],
  aprobado: ["publicado"],
  rechazado: ["borrador"],
  publicado: [],
};

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Autenticación requerida" }, { status: 401 });
  }
  const body = (await request.json()) as { entityId?: string; fromStatus?: string; toStatus?: string; comment?: string };
  if (!body.entityId || !body.fromStatus || !body.toStatus) {
    return NextResponse.json({ error: "Transición incompleta" }, { status: 400 });
  }
  if (!allowedTransitions[body.fromStatus]?.includes(body.toStatus)) {
    return NextResponse.json({ error: "Transición de revisión no permitida" }, { status: 409 });
  }
  const reviewId = crypto.randomUUID();
  const reviewer = user?.email ?? "local-reviewer@mapia.dev";
  const persisted = await persistReview({
    id: reviewId,
    entityId: body.entityId,
    reviewerUserId: user?.userId ?? "local-reviewer",
    fromStatus: body.fromStatus,
    toStatus: body.toStatus,
    comment: body.comment ?? null,
  });
  return NextResponse.json({
    data: {
      id: reviewId,
      entityId: body.entityId,
      fromStatus: body.fromStatus,
      toStatus: body.toStatus,
      comment: body.comment ?? null,
      reviewer,
      createdAt: new Date().toISOString(),
      persisted,
    },
  }, { status: 201 });
}
