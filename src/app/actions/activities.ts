"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { activities, activityTypes, members } from "@/db/schema";
import { requireAdmin, requireMember } from "@/lib/auth";
import { applyXp, logAudit, notify, notifyEveryone } from "@/lib/gamification";
import { todayISO } from "@/lib/xp";

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

export async function createActivityAction(formData: FormData) {
  const member = await requireMember();
  const typeId = Number(formData.get("typeId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const occurredAt = String(formData.get("occurredAt") ?? todayISO());
  const proofUrl = String(formData.get("proofUrl") ?? "").trim();
  const requestedMember = Number(formData.get("memberId") ?? member.id);
  const memberId = member.role === "admin" && requestedMember ? requestedMember : member.id;

  if (!title || title.length < 3) redirect("/atividades?msg=Informe%20um%20nome%20v%C3%A1lido%20para%20a%20atividade.");
  const [type] = await db.select().from(activityTypes).where(eq(activityTypes.id, typeId)).limit(1);
  if (!type) redirect("/atividades?msg=Selecione%20uma%20atividade%20v%C3%A1lida.");

  let proofName: string | null = null;
  let proofData: string | null = null;
  const file = formData.get("proof");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PROOF_BYTES) {
      redirect("/atividades?msg=O%20comprovante%20deve%20ter%20no%20m%C3%A1ximo%203MB.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    proofData = `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
    proofName = file.name;
  }

  const insertResult = await db
    .insert(activities)
    .values({
      memberId,
      typeId: type.id,
      title,
      description: description || null,
      category: type.category,
      occurredAt,
      status: "pending",
      proofUrl: proofUrl || null,
      proofName,
      proofData,
    })
    .returning({ id: activities.id });

  const reviewers = await db
    .select({ id: members.id, name: members.name, role: members.role })
    .from(members)
    .where(and(eq(members.role, "admin"), ne(members.id, memberId)));
  for (const reviewer of reviewers) {
    await notify(
      reviewer.id,
      "approval",
      "Nova atividade aguardando aprovação",
      `${member.name} registrou "${title}" (${type.name} • +${type.xp} XP).`,
      "/admin?tab=aprovacoes",
    );
  }
  if (!reviewers.length) {
    await notifyEveryone(
      "approval",
      "Atividade aguardando aprovação",
      `"${title}" precisa da validação de outro administrador.`,
      "/admin?tab=aprovacoes",
      memberId,
    );
  }
  await logAudit(member.id, "activity.created", "activity", insertResult[0]?.id ?? null, `Atividade "${title}" registrada (${type.name}).`);
  revalidatePath("/", "layout");
  redirect("/atividades?msg=Atividade%20registrada!%20Aguarde%20a%20aprova%C3%A7%C3%A3o%20de%20um%20administrador.");
}

export async function reviewActivityAction(formData: FormData) {
  const admin = await requireAdmin();
  const activityId = Number(formData.get("activityId"));
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/admin?tab=aprovacoes");

  const [record] = await db.select().from(activities).where(eq(activities.id, activityId)).limit(1);
  if (!record) redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}msg=Atividade%20n%C3%A3o%20encontrada.`);
  if (record.memberId === admin.id) {
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}msg=Voc%C3%AA%20n%C3%A3o%20pode%20aprovar%20a%20pr%C3%B3pria%20atividade.`);
  }
  if (record.status !== "pending") {
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}msg=Esta%20atividade%20j%C3%A1%20foi%20avaliada.`);
  }

  const [type] = await db.select().from(activityTypes).where(eq(activityTypes.id, record.typeId)).limit(1);

  if (decision === "approve" && type) {
    await db
      .update(activities)
      .set({
        status: "approved",
        xpAwarded: type.xp,
        reviewerId: admin.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      })
      .where(eq(activities.id, record.id));

    const result = await applyXp({
      memberId: record.memberId,
      amount: type.xp,
      reason: `${type.name} aprovada`,
      source: "activity",
      referenceId: record.id,
      actorId: admin.id,
    });

    await notify(
      record.memberId,
      "activity",
      `Atividade aprovada: ${record.title}`,
      `Você recebeu +${type.xp} XP pela atividade "${record.title}"${result.rankUp && result.rank ? ` e alcançou a patente ${result.rank.name}` : ""}.`,
      "/atividades",
    );
    await logAudit(
      admin.id,
      "activity.approved",
      "activity",
      record.id,
      `${admin.name} aprovou "${record.title}" de ${record.memberId === admin.id ? "si mesmo" : "outro integrante"} (+${type.xp} XP).`,
    );
    revalidatePath("/", "layout");
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}msg=Atividade%20aprovada%20e%20XP%20concedido.`);
  }

  await db
    .update(activities)
    .set({
      status: "rejected",
      xpAwarded: 0,
      reviewerId: admin.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || "Atividade rejeitada pela administração.",
    })
    .where(eq(activities.id, record.id));
  await notify(
    record.memberId,
    "activity",
    `Atividade rejeitada: ${record.title}`,
    reviewNote || "A administração rejeitou esta atividade. Ajuste os detalhes e registre novamente.",
    "/atividades",
  );
  await logAudit(admin.id, "activity.rejected", "activity", record.id, `${admin.name} rejeitou "${record.title}".`);
  revalidatePath("/", "layout");
  redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}msg=Atividade%20rejeitada.`);
}
