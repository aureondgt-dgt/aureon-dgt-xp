import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getCurrentMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentMember();
  if (!session) {
    return new Response("Não autorizado", { status: 401 });
  }
  const { id } = await params;
  const activityId = Number(id);
  if (!Number.isFinite(activityId)) {
    return new Response("Registro inválido", { status: 400 });
  }

  const [record] = await db
    .select({ proofData: activities.proofData, proofName: activities.proofName })
    .from(activities)
    .where(eq(activities.id, activityId))
    .limit(1);

  if (!record?.proofData) {
    return new Response("Comprovante não encontrado", { status: 404 });
  }

  const match = record.proofData.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return new Response("Formato de arquivo inválido", { status: 422 });
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const safeName = (record.proofName ?? "comprovante").replace(/["\r\n]/g, "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
