"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { missionClaims, missions, notifications } from "@/db/schema";
import { requireMember } from "@/lib/auth";
import { applyXp, logAudit, notify } from "@/lib/gamification";
import { getMissionsView } from "@/lib/queries";

export async function claimMissionAction(formData: FormData) {
  const member = await requireMember();
  const missionId = Number(formData.get("missionId"));
  const view = await getMissionsView(member.id);
  const mission = view.find((item) => item.id === missionId);

  if (!mission) redirect("/missoes?msg=Miss%C3%A3o%20n%C3%A3o%20encontrada.");
  if (mission.claimed) redirect("/missoes?msg=Recompensa%20j%C3%A1%20resgatada.");
  if (!mission.completed) redirect("/missoes?msg=Continue%20executando%3A%20a%20miss%C3%A3o%20ainda%20n%C3%A3o%20foi%20conclu%C3%ADda.");

  const [record] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!record || record.status !== "active") redirect("/missoes?msg=Miss%C3%A3o%20indispon%C3%ADvel.");

  const inserted = await db
    .insert(missionClaims)
    .values({ missionId, memberId: member.id, xpAwarded: record.xpReward })
    .onConflictDoNothing()
    .returning({ id: missionClaims.id });
  if (!inserted.length) redirect("/missoes?msg=Recompensa%20j%C3%A1%20resgatada.");

  await applyXp({
    memberId: member.id,
    amount: record.xpReward,
    reason: `Missão concluída: ${record.title}`,
    source: "mission",
    referenceId: record.id,
    actorId: member.id,
  });
  await notify(
    member.id,
    "mission",
    `Missão concluída: ${record.title}`,
    `Recompensa de +${record.xpReward} XP creditada na sua conta.`,
    "/missoes",
  );
  await logAudit(member.id, "mission.claimed", "mission", record.id, `${member.name} resgatou a missão "${record.title}" (+${record.xpReward} XP).`);
  revalidatePath("/", "layout");
  redirect("/missoes?msg=Recompensa%20resgatada%20com%20sucesso!");
}

export async function markNotificationsReadAction() {
  const member = await requireMember();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.memberId, member.id)));
  revalidatePath("/", "layout");
}
