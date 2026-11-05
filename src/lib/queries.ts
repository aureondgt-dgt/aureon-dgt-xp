import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  achievements,
  activities,
  activityTypes,
  auditLogs,
  memberAchievements,
  members,
  missionClaims,
  missions,
  notifications,
  ranks,
  xpTransactions,
} from "@/db/schema";
import { ensureDatabase } from "@/db/bootstrap";
import { getLevelInfo, getRankInfo, todayISO, type RankLike } from "./xp";
import { ACTIVITY_SLUGS_BY_METRIC, buildDailySeries, dayKey } from "./metrics";

export type MemberStat = {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  accent: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string;
  createdAt: string;
  totalXp: number;
  weekXp: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  activeDays: number;
  level: number;
  levelPct: number;
  intoLevel: number;
  needed: number;
  rank: RankLike;
  nextRank: RankLike | null;
  rankPct: number;
};

export type RankedMember = MemberStat & { position: number };

export type ActivityView = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  occurredAt: string;
  status: string;
  xpAwarded: number;
  typeXp: number;
  typeName: string;
  typeSlug: string;
  typeIcon: string;
  proofUrl: string | null;
  proofName: string | null;
  hasProof: boolean;
  createdAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  memberId: number;
  memberName: string;
  memberAccent: string;
  memberJobTitle: string;
  memberAvatarUrl: string | null;
  reviewerName: string | null;
};

export type MissionView = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  scope: string;
  metric: string;
  target: number;
  xpReward: number;
  startsAt: string;
  endsAt: string;
  status: string;
  progress: number;
  pct: number;
  completed: boolean;
  claimed: boolean;
  canClaim: boolean;
  expired: boolean;
};

export type AchievementView = {
  id: number;
  slug: string;
  name: string;
  description: string;
  conditionType: string;
  target: number;
  xpReward: number;
  icon: string;
  rarity: string;
  unlockedAt: string | null;
  progress: number;
};

export type MetricCounts = Record<string, number>;

export async function getRanks(): Promise<RankLike[]> {
  await ensureDatabase();
  const rows = await db.select().from(ranks).orderBy(asc(ranks.minXp));
  return rows.map((rank) => ({
    id: rank.id,
    name: rank.name,
    slug: rank.slug,
    minXp: rank.minXp,
    tier: rank.tier,
    color: rank.color,
    description: rank.description,
  }));
}

export async function getTeamWithStats(): Promise<MemberStat[]> {
  await ensureDatabase();
  const weekStart = new Date();
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + (day === 0 ? -6 : 1 - day));
  weekStart.setHours(0, 0, 0, 0);
  const activeSince = new Date(Date.now() - 30 * 86400000);

  const [memberRows, rankRows, xpRows, weekXpRows, activityRows, activeDayRows] = await Promise.all([
    db.select().from(members).orderBy(asc(members.id)),
    getRanks(),
    db
      .select({
        memberId: xpTransactions.memberId,
        total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int`,
      })
      .from(xpTransactions)
      .groupBy(xpTransactions.memberId),
    db
      .select({
        memberId: xpTransactions.memberId,
        total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int`,
      })
      .from(xpTransactions)
      .where(gte(xpTransactions.createdAt, weekStart))
      .groupBy(xpTransactions.memberId),
    db
      .select({
        memberId: activities.memberId,
        status: activities.status,
        total: sql<number>`count(*)::int`,
      })
      .from(activities)
      .groupBy(activities.memberId, activities.status),
    db
      .select({
        memberId: activities.memberId,
        total: sql<number>`count(distinct ${activities.occurredAt})::int`,
      })
      .from(activities)
      .where(and(eq(activities.status, "approved"), gte(activities.createdAt, activeSince)))
      .groupBy(activities.memberId),
  ]);

  const xpMap = new Map(xpRows.map((row) => [row.memberId, Number(row.total)]));
  const weekMap = new Map(weekXpRows.map((row) => [row.memberId, Number(row.total)]));
  const activeDayMap = new Map(activeDayRows.map((row) => [row.memberId, Number(row.total)]));
  const activityMap = new Map<number, { approved: number; pending: number; rejected: number }>();
  for (const row of activityRows) {
    const entry = activityMap.get(row.memberId) ?? { approved: 0, pending: 0, rejected: 0 };
    if (row.status === "approved") entry.approved = Number(row.total);
    if (row.status === "pending") entry.pending = Number(row.total);
    if (row.status === "rejected") entry.rejected = Number(row.total);
    activityMap.set(row.memberId, entry);
  }

  return memberRows.map((member) => {
    const totalXp = xpMap.get(member.id) ?? 0;
    const levelInfo = getLevelInfo(totalXp);
    const rankInfo = getRankInfo(totalXp, rankRows);
    const counts = activityMap.get(member.id) ?? { approved: 0, pending: 0, rejected: 0 };
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      jobTitle: member.jobTitle,
      role: member.role,
      accent: member.accent,
      avatarUrl: member.avatarUrl,
      bio: member.bio,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
      totalXp,
      weekXp: weekMap.get(member.id) ?? 0,
      approvedCount: counts.approved,
      pendingCount: counts.pending,
      rejectedCount: counts.rejected,
      activeDays: activeDayMap.get(member.id) ?? 0,
      level: levelInfo.level,
      levelPct: levelInfo.pct,
      intoLevel: levelInfo.intoLevel,
      needed: levelInfo.needed,
      rank: rankInfo.current,
      nextRank: rankInfo.next,
      rankPct: rankInfo.pct,
    };
  });
}

export function withPositions(team: MemberStat[]): RankedMember[] {
  return [...team]
    .filter((member) => member.status === "active")
    .sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name))
    .map((member, index) => ({ ...member, position: index + 1 }));
}

export async function getRanking(): Promise<{ ranked: RankedMember[]; ranks: RankLike[] }> {
  const [team, rankList] = await Promise.all([getTeamWithStats(), getRanks()]);
  return { ranked: withPositions(team), ranks: rankList };
}

export async function getMember(id: number): Promise<MemberStat | null> {
  const team = await getTeamWithStats();
  return team.find((member) => member.id === id) ?? null;
}

export async function getActivityTypes() {
  await ensureDatabase();
  return db.select().from(activityTypes).orderBy(asc(activityTypes.sortOrder), asc(activityTypes.id));
}

export async function getMetricCounts(memberId: number): Promise<MetricCounts> {
  await ensureDatabase();
  const [slugRows, daysRows, xpRows] = await Promise.all([
    db
      .select({ slug: activityTypes.slug, total: sql<number>`count(*)::int` })
      .from(activities)
      .innerJoin(activityTypes, eq(activities.typeId, activityTypes.id))
      .where(and(eq(activities.memberId, memberId), eq(activities.status, "approved")))
      .groupBy(activityTypes.slug),
    db
      .select({ total: sql<number>`count(distinct ${activities.occurredAt})::int` })
      .from(activities)
      .where(and(eq(activities.memberId, memberId), eq(activities.status, "approved"))),
    db
      .select({ total: sql<number>`coalesce(sum(${xpTransactions.amount}), 0)::int` })
      .from(xpTransactions)
      .where(eq(xpTransactions.memberId, memberId)),
  ]);

  const bySlug = new Map(slugRows.map((row) => [row.slug, Number(row.total)]));
  const counts: MetricCounts = {};
  let total = 0;
  for (const [slug, value] of bySlug) {
    counts[slug] = value;
    total += value;
  }
  counts.sales = bySlug.get("fechar-venda") ?? 0;
  counts.clients = bySlug.get("conseguir-interessado") ?? 0;
  counts.meetings = bySlug.get("agendar-reuniao") ?? 0;
  counts.sites_created = bySlug.get("criar-site") ?? 0;
  counts.sites_delivered = bySlug.get("entregar-site") ?? 0;
  counts.content = bySlug.get("criar-conteudo") ?? 0;
  counts.strategies = bySlug.get("criar-estrategia") ?? 0;
  counts.activities = total;
  counts.active_days = Number(daysRows[0]?.total ?? 0);
  counts.xp = Number(xpRows[0]?.total ?? 0);
  return counts;
}

export async function getMissionsView(memberId: number): Promise<MissionView[]> {
  await ensureDatabase();
  const [missionRows, claims, typeRows] = await Promise.all([
    db.select().from(missions).orderBy(asc(missions.status), asc(missions.endsAt)),
    db.select().from(missionClaims).where(eq(missionClaims.memberId, memberId)),
    db.select().from(activityTypes),
  ]);
  const slugById = new Map(typeRows.map((row) => [row.id, row.slug]));
  const earliest = missionRows.reduce(
    (min, mission) => (min === "" || mission.startsAt < min ? mission.startsAt : min),
    "",
  );
  const activityRows = earliest
    ? await db
        .select({
          memberId: activities.memberId,
          typeId: activities.typeId,
          occurredAt: activities.occurredAt,
          xpAwarded: activities.xpAwarded,
        })
        .from(activities)
        .where(and(eq(activities.status, "approved"), gte(activities.occurredAt, earliest)))
    : [];
  const claimMap = new Set(claims.map((claim) => claim.missionId));
  const today = todayISO();

  return missionRows.map((mission) => {
    const scoped = activityRows.filter((row) => {
      if (row.occurredAt < mission.startsAt || row.occurredAt > mission.endsAt) return false;
      if (mission.scope === "individual" && row.memberId !== memberId) return false;
      return true;
    });
    const wantedSlugs = ACTIVITY_SLUGS_BY_METRIC[mission.metric] ?? [];
    const matching = wantedSlugs.length
      ? scoped.filter((row) => wantedSlugs.includes(slugById.get(row.typeId) ?? ""))
      : scoped;
    const progress =
      mission.metric === "xp"
        ? matching.reduce((sum, row) => sum + row.xpAwarded, 0)
        : matching.length;
    const completed = progress >= mission.target;
    const claimed = claimMap.has(mission.id);
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      type: mission.type,
      scope: mission.scope,
      metric: mission.metric,
      target: mission.target,
      xpReward: mission.xpReward,
      startsAt: mission.startsAt,
      endsAt: mission.endsAt,
      status: mission.status,
      progress,
      pct: Math.min(100, Math.round((progress / Math.max(1, mission.target)) * 100)),
      completed,
      claimed,
      canClaim: completed && !claimed && mission.status === "active",
      expired: mission.endsAt < today,
    };
  });
}

export async function getAchievementsView(memberId: number): Promise<AchievementView[]> {
  await ensureDatabase();
  const [all, unlocked, counts] = await Promise.all([
    db.select().from(achievements).orderBy(asc(achievements.sortOrder), asc(achievements.id)),
    db.select().from(memberAchievements).where(eq(memberAchievements.memberId, memberId)),
    getMetricCounts(memberId),
  ]);
  const unlockedMap = new Map(unlocked.map((row) => [row.achievementId, row.unlockedAt]));
  return all.map((achievement) => ({
    id: achievement.id,
    slug: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    conditionType: achievement.conditionType,
    target: achievement.target,
    xpReward: achievement.xpReward,
    icon: achievement.icon,
    rarity: achievement.rarity,
    unlockedAt: unlockedMap.get(achievement.id)?.toISOString() ?? null,
    progress: Math.min(achievement.target, counts[achievement.conditionType] ?? 0),
  }));
}

export async function getActivitiesView(options: {
  memberId?: number;
  status?: string;
  limit?: number;
  typeId?: number;
} = {}): Promise<ActivityView[]> {
  await ensureDatabase();
  const reviewer = alias(members, "reviewer");
  const conditions = [];
  if (options.memberId) conditions.push(eq(activities.memberId, options.memberId));
  if (options.status && options.status !== "all") conditions.push(eq(activities.status, options.status));
  if (options.typeId) conditions.push(eq(activities.typeId, options.typeId));

  let query = db
    .select({
      id: activities.id,
      title: activities.title,
      description: activities.description,
      category: activities.category,
      occurredAt: activities.occurredAt,
      status: activities.status,
      xpAwarded: activities.xpAwarded,
      typeXp: activityTypes.xp,
      typeName: activityTypes.name,
      typeSlug: activityTypes.slug,
      typeIcon: activityTypes.icon,
      proofUrl: activities.proofUrl,
      proofName: activities.proofName,
      hasProof: sql<boolean>`(${activities.proofData} is not null or ${activities.proofUrl} is not null)`,
      createdAt: activities.createdAt,
      reviewNote: activities.reviewNote,
      reviewedAt: activities.reviewedAt,
      memberId: members.id,
      memberName: members.name,
      memberAccent: members.accent,
      memberJobTitle: members.jobTitle,
      memberAvatarUrl: members.avatarUrl,
      reviewerName: reviewer.name,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.typeId, activityTypes.id))
    .innerJoin(members, eq(activities.memberId, members.id))
    .leftJoin(reviewer, eq(activities.reviewerId, reviewer.id))
    .$dynamic();

  if (conditions.length) {
    query = query.where(and(...conditions));
  }
  const rows = await query.orderBy(desc(activities.createdAt)).limit(options.limit ?? 200);
  return rows.map((row) => ({
      ...row,
      hasProof: Boolean(row.hasProof),
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    }));
}

export async function getXpHistory(memberId: number, limit = 40) {
  await ensureDatabase();
  const actor = alias(members, "actor");
  const rows = await db
    .select({
      id: xpTransactions.id,
      amount: xpTransactions.amount,
      reason: xpTransactions.reason,
      source: xpTransactions.source,
      note: xpTransactions.note,
      createdAt: xpTransactions.createdAt,
      actorName: actor.name,
    })
    .from(xpTransactions)
    .leftJoin(actor, eq(xpTransactions.actorId, actor.id))
    .where(eq(xpTransactions.memberId, memberId))
    .orderBy(desc(xpTransactions.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getNotifications(memberId: number) {
  await ensureDatabase();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.memberId, memberId))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
  return {
    unread: rows.filter((row) => row.readAt === null).length,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function getAuditLogs(limit = 40) {
  await ensureDatabase();
  const actor = alias(members, "actor");
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      actorName: actor.name,
      actorAccent: actor.accent,
    })
    .from(auditLogs)
    .leftJoin(actor, eq(auditLogs.actorId, actor.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getDailyXpSeries(memberIds: number[], days = 90) {
  await ensureDatabase();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));
  const rows = memberIds.length
    ? await db
        .select({
          memberId: xpTransactions.memberId,
          amount: xpTransactions.amount,
          createdAt: xpTransactions.createdAt,
        })
        .from(xpTransactions)
        .where(and(inArray(xpTransactions.memberId, memberIds), gte(xpTransactions.createdAt, from)))
    : [];
  const keys = buildDailySeries(days);
  const map = new Map<string, Map<string, number>>();
  for (const id of memberIds) map.set(String(id), new Map());
  for (const row of rows) {
    const bucket = map.get(String(row.memberId));
    if (!bucket) continue;
    const key = dayKey(row.createdAt);
    bucket.set(key, (bucket.get(key) ?? 0) + row.amount);
  }
  return keys.map((key) => {
    const point: Record<string, number | string> = { date: key };
    for (const id of memberIds) point[String(id)] = map.get(String(id))?.get(key) ?? 0;
    return point;
  });
}

export async function getDashboardData(memberId: number) {
  const [team, ranks, missionsView, achievementView, recentActivities, xpHistory] = await Promise.all([
    getTeamWithStats(),
    getRanks(),
    getMissionsView(memberId),
    getAchievementsView(memberId),
    getActivitiesView({ limit: 8 }),
    getXpHistory(memberId, 8),
  ]);
  const ranked = withPositions(team);
  const me = ranked.find((entry) => entry.id === memberId) ?? ranked[0];
  const series = await getDailyXpSeries(ranked.map((entry) => entry.id), 90);
  const today = todayISO();
  const todaysMissions = missionsView.filter(
    (mission) => mission.status === "active" && mission.type === "daily" && mission.endsAt >= today,
  );
  const weeklyMissions = missionsView.filter(
    (mission) => mission.status === "active" && mission.type === "weekly",
  );
  return {
    me,
    ranked,
    ranks,
    missionsView,
    todaysMissions,
    weeklyMissions,
    achievements: achievementView,
    unlockedAchievements: achievementView.filter((item) => item.unlockedAt),
    recentActivities,
    xpHistory,
    xpSeries: series,
  };
}

export type TeamActivityRaw = {
  memberId: number;
  slug: string;
  category: string;
  occurredAt: string;
  xpAwarded: number;
  createdAt: string;
};

export async function getTeamActivitiesRaw(days = 90): Promise<TeamActivityRaw[]> {
  await ensureDatabase();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - days);
  const rows = await db
    .select({
      memberId: activities.memberId,
      slug: activityTypes.slug,
      category: activities.category,
      occurredAt: activities.occurredAt,
      xpAwarded: activities.xpAwarded,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .innerJoin(activityTypes, eq(activities.typeId, activityTypes.id))
    .where(and(eq(activities.status, "approved"), gte(activities.occurredAt, from.toISOString().slice(0, 10))))
    .orderBy(desc(activities.occurredAt));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

export async function getStatsData() {
  const [team, rankList, rawActivities] = await Promise.all([
    getTeamWithStats(),
    getRanks(),
    getTeamActivitiesRaw(120),
  ]);
  const ranked = withPositions(team);
  const memberIds = team.map((member) => member.id);
  const xpSeries = await getDailyXpSeries(memberIds, 84);
  return { team: ranked, ranks: rankList, rawActivities, xpSeries };
}

export async function getPendingApprovalsCount(): Promise<number> {
  await ensureDatabase();
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(activities)
    .where(eq(activities.status, "pending"));
  return Number(row?.total ?? 0);
}

export async function getAdminOverview() {
  const [team, pendingCount, logs] = await Promise.all([
    getTeamWithStats(),
    getPendingApprovalsCount(),
    getAuditLogs(10),
  ]);
  const totalXp = team.reduce((sum, member) => sum + member.totalXp, 0);
  const approved = team.reduce((sum, member) => sum + member.approvedCount, 0);
  const pending = team.reduce((sum, member) => sum + member.pendingCount, 0);
  return { team: withPositions(team), pendingCount, logs, totalXp, approved, pending };
}

export async function getAdminCollections() {
  await ensureDatabase();
  const [types, missionRows, achievementRows, rankRows] = await Promise.all([
    db.select().from(activityTypes).orderBy(asc(activityTypes.sortOrder), asc(activityTypes.id)),
    db.select().from(missions).orderBy(desc(missions.createdAt)),
    db.select().from(achievements).orderBy(asc(achievements.sortOrder), asc(achievements.id)),
    db.select().from(ranks).orderBy(asc(ranks.minXp)),
  ]);
  return { types, missions: missionRows, achievements: achievementRows, ranks: rankRows };
}

export async function getMembersList() {
  await ensureDatabase();
  return db.select().from(members).orderBy(asc(members.name));
}

export async function getTeamActivitiesForStats(memberIds: number[], from: string, to: string) {
  await ensureDatabase();
  return db
    .select({
      memberId: activities.memberId,
      occurredAt: activities.occurredAt,
      xpAwarded: activities.xpAwarded,
    })
    .from(activities)
    .where(
      and(
        inArray(activities.memberId, memberIds),
        eq(activities.status, "approved"),
        gte(activities.occurredAt, from),
        lte(activities.occurredAt, to),
      ),
    );
}
