import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  auditLogs,
  memberAchievements,
  members,
  notifications,
  xpTransactions,
} from "@/db/schema";
import { ensureDatabase } from "@/db/bootstrap";
import { getLevelInfo, getRankInfo } from "./xp";
import { getMetricCounts, getRanks } from "./queries";

export type UnlockedAchievement = { name: string; icon: string; xpReward: number };

export async function notify(
  memberId: number,
  type: string,
  title: string,
  body?: string,
  link?: string,
): Promise<void> {
  await db.insert(notifications).values({ memberId, type, title, body: body ?? null, link: link ?? null });
}

export async function notifyEveryone(
  type: string,
  title: string,
  body?: string,
  link?: string,
  excludeId?: number,
): Promise<void> {
  const all = await db.select({ id: members.id }).from(members).where(eq(members.status, "active"));
  const targets = all.filter((member) => member.id !== excludeId);
  if (!targets.length) return;
  await db.insert(notifications).values(
    targets.map((member) => ({ memberId: member.id, type, title, body: body ?? null, link: link ?? null })),
  );
}

export async function logAudit(
  actorId: number | null,
  action: string,
  entity: string,
  entityId: number | null,
  details: string,
): Promise<void> {
  await db.insert(auditLogs).values({ actorId, action, entity, entityId, details });
}

export async function getXpTotal(memberId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int` })
    .from(xpTransactions)
    .where(eq(xpTransactions.memberId, memberId));
  return Number(row?.total ?? 0);
}

export async function evaluateAchievements(memberId: number): Promise<UnlockedAchievement[]> {
  await ensureDatabase();
  const [catalog, owned, counts] = await Promise.all([
    db.select().from(achievements).where(eq(achievements.active, true)),
    db.select().from(memberAchievements).where(eq(memberAchievements.memberId, memberId)),
    getMetricCounts(memberId),
  ]);
  const ownedIds = new Set(owned.map((row) => row.achievementId));
  const newly = catalog.filter(
    (achievement) => !ownedIds.has(achievement.id) && (counts[achievement.conditionType] ?? 0) >= achievement.target,
  );
  const unlocked: UnlockedAchievement[] = [];
  for (const achievement of newly) {
    const inserted = await db
      .insert(memberAchievements)
      .values({ memberId, achievementId: achievement.id })
      .onConflictDoNothing()
      .returning({ id: memberAchievements.id });
    if (!inserted.length) continue;
    unlocked.push({ name: achievement.name, icon: achievement.icon, xpReward: achievement.xpReward });
    await notify(
      memberId,
      "achievement",
      `Conquista desbloqueada: ${achievement.name}`,
      `${achievement.description}${achievement.xpReward > 0 ? ` Recompensa: +${achievement.xpReward} XP.` : ""}`,
      "/conquistas",
    );
    await logAudit(
      memberId,
      "achievement.unlocked",
      "achievement",
      achievement.id,
      `Conquista "${achievement.name}" desbloqueada.`,
    );
  }
  const reward = unlocked.reduce((sum, item) => sum + item.xpReward, 0);
  if (reward > 0) {
    await db.insert(xpTransactions).values({
      memberId,
      amount: reward,
      reason: `Recompensas de conquistas (${unlocked.length})`,
      source: "achievement",
      actorId: null,
    });
  }
  return unlocked;
}

type ApplyXpParams = {
  memberId: number;
  amount: number;
  reason: string;
  source?: string;
  referenceId?: number | null;
  actorId?: number | null;
  note?: string | null;
  notifyMember?: boolean;
};

export async function applyXp({
  memberId,
  amount,
  reason,
  source = "activity",
  referenceId = null,
  actorId = null,
  note = null,
  notifyMember = false,
}: ApplyXpParams) {
  const ranks = await getRanks();
  const beforeXp = await getXpTotal(memberId);
  const beforeRank = getRankInfo(beforeXp, ranks).current;

  await db.insert(xpTransactions).values({
    memberId,
    amount,
    reason,
    source,
    referenceId,
    actorId,
    note,
  });

  const afterXp = beforeXp + amount;
  const rankInfo = getRankInfo(afterXp, ranks);
  const leveledRankUp = rankInfo.current && beforeRank && rankInfo.current.id !== beforeRank.id && amount > 0;

  if (leveledRankUp && rankInfo.current) {
    await notify(
      memberId,
      "rank",
      `Nova patente: ${rankInfo.current.name}`,
      `Você alcançou a patente ${rankInfo.current.name} com ${afterXp} XP. ${rankInfo.current.description ?? ""}`,
      "/ranking",
    );
  }

  if (notifyMember && amount !== 0) {
    await notify(
      memberId,
      "xp",
      `${amount > 0 ? "+" : ""}${amount} XP recebidos`,
      reason,
      "/atividades",
    );
  }

  const unlocked = await evaluateAchievements(memberId);
  const finalXp = await getXpTotal(memberId);
  const levelInfo = getLevelInfo(finalXp);

  return {
    beforeXp,
    afterXp: finalXp,
    level: levelInfo.level,
    rank: getRankInfo(finalXp, ranks).current,
    previousRank: beforeRank,
    rankUp: Boolean(leveledRankUp),
    unlocked,
  };
}
