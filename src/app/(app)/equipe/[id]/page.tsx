import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import {
  getAchievementsView,
  getActivitiesView,
  getDailyXpSeries,
  getMember,
  getRanking,
  getXpHistory,
} from "@/lib/queries";
import { formatDate, formatDateTime, formatNumber, timeAgo } from "@/lib/xp";
import { Avatar, EmptyState, Flash, Progress, SectionCard, StatCard } from "@/components/ui";
import { AchievementBadge, RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";
import { XpProgressChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const session = await requireMember();
  const { id } = await params;
  const { msg } = await searchParams;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) notFound();

  const member = await getMember(memberId);
  if (!member) notFound();
  const isSelf = member.id === session.id;
  const isAdmin = session.role === "admin";
  const canSeePrivate = isSelf || isAdmin;

  const [achievements, activities, history, ranking, seriesRaw] = await Promise.all([
    getAchievementsView(member.id),
    getActivitiesView({ memberId: member.id, status: canSeePrivate ? "all" : "approved", limit: 60 }),
    canSeePrivate ? getXpHistory(member.id, 20) : Promise.resolve([]),
    getRanking(),
    getDailyXpSeries([member.id], 90),
  ]);
  const ranked = ranking.ranked.find((entry) => entry.id === member.id);
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt);
  const series = seriesRaw.map((point) => ({ date: String(point.date), value: Number(point[String(member.id)] ?? 0) }));

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <div className="flex items-center gap-2 text-[0.7rem] text-white/40">
        <Link href="/equipe" className="inline-flex items-center gap-1 hover:text-white">
          <Icon name="users" size={12} /> Equipe
        </Link>
        <Icon name="chevron-right" size={11} />
        <span className="text-white/70">{member.name}</span>
      </div>

      <section className="card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-neon/15 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              {ranked?.position === 1 ? (
                <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-amber-300">
                  <Icon name="crown" size={19} />
                </span>
              ) : null}
              <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={92} ring={member.rank.color} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white">{member.name}</h1>
                {member.role === "admin" ? (
                  <span className="chip border-neon/30 bg-neon/10 text-[0.6rem] text-neon-bright">
                    <Icon name="shield" size={10} /> Administrador
                  </span>
                ) : null}
                {isSelf ? <span className="chip border-white/10 bg-white/5 text-[0.6rem] text-white/60">seu perfil</span> : null}
              </div>
              <p className="mt-0.5 text-sm text-white/55">{member.jobTitle}</p>
              <p className="mt-1 text-[0.68rem] text-white/35">
                {canSeePrivate ? member.email : "Dados de contato protegidos"} • desde {formatDate(member.createdAt)}
              </p>
              {member.bio ? <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/45">{member.bio}</p> : null}
            </div>
          </div>
          <div className="lg:ml-auto">
            <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <RankEmblem tier={member.rank.tier} color={member.rank.color} size={70} />
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.16em] text-white/35">Patente</p>
                <p className="text-lg font-semibold text-white">{member.rank.name}</p>
                <p className="text-[0.68rem] text-white/45">
                  Nível {member.level} • #{ranked?.position ?? "—"} no ranking
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="relative mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[0.68rem]">
            <span className="text-white/45">
              {formatNumber(member.intoLevel)} / {formatNumber(member.needed)} XP para o nível {member.level + 1}
            </span>
            <span className="font-semibold text-neon-bright">{member.levelPct}%</span>
          </div>
          <Progress value={member.levelPct} height={8} color={member.accent} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="XP total" value={formatNumber(member.totalXp)} hint={`+${formatNumber(member.weekXp)} nesta semana`} icon="zap" index={0} />
        <StatCard label="Atividades" value={member.approvedCount} hint={`${member.pendingCount} pendentes`} icon="briefcase" color="#c084fc" index={1} />
        <StatCard label="Conquistas" value={`${unlocked.length}/${achievements.length}`} hint="Medalhas desbloqueadas" icon="medal" color="#fbbf24" index={2} />
        <StatCard label="Dias ativos" value={member.activeDays} hint="Últimos 30 dias" icon="flame" color="#fb923c" index={3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard title="Evolução individual" icon="chart" className="xl:col-span-7" subtitle="XP acumulado nos últimos períodos.">
          <XpProgressChart data={series} accent={member.accent} />
        </SectionCard>

        <SectionCard title="Conquistas" icon="medal" className="xl:col-span-5" subtitle={`${unlocked.length} de ${achievements.length} desbloqueadas`}>
          <div className="grid grid-cols-4 gap-2">
            {achievements.slice(0, 8).map((achievement) => (
              <div key={achievement.id} className="flex flex-col items-center gap-1 text-center">
                <AchievementBadge icon={achievement.icon} rarity={achievement.rarity} unlocked={Boolean(achievement.unlockedAt)} size={52} />
                <p className="line-clamp-2 text-[0.55rem] leading-tight text-white/45">{achievement.name}</p>
              </div>
            ))}
          </div>
          <Link href="/conquistas" className="btn-ghost mt-3 w-full py-1.5 text-[0.7rem]">
            Ver coleção completa
          </Link>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard title="Histórico de atividades" icon="history" className="xl:col-span-7">
          {activities.length === 0 ? (
            <EmptyState title="Nenhuma atividade registrada" icon="briefcase" />
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 12).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2.5 rounded-lg border border-white/6 bg-white/[0.015] p-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                    <Icon name={activity.status === "approved" ? "check" : activity.status === "pending" ? "clock" : "x"} size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white/80">{activity.title}</p>
                    <p className="text-[0.6rem] text-white/35">
                      {activity.typeName} • {formatDate(activity.occurredAt)} • {timeAgo(activity.createdAt)}
                    </p>
                  </div>
                  <span className={`text-[0.68rem] font-semibold ${activity.status === "approved" ? "text-emerald-300" : "text-white/30"}`}>
                    {activity.status === "approved" ? `+${activity.xpAwarded} XP` : activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {canSeePrivate ? (
          <SectionCard title="Histórico de XP" icon="zap" className="xl:col-span-5">
            <div className="space-y-2">
              {history.length === 0 ? (
                <EmptyState title="Sem lançamentos" icon="zap" />
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2.5 rounded-lg border border-white/6 bg-white/[0.015] px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.72rem] text-white/75">{entry.reason}</p>
                      <p className="text-[0.6rem] text-white/30">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    <span className={`text-[0.7rem] font-semibold ${entry.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Privacidade" icon="lock" className="xl:col-span-5">
            <p className="text-xs leading-relaxed text-white/45">
              O histórico completo de XP e as atividades pendentes deste integrante são visíveis apenas para ele e para a
              administração da Aureon.
            </p>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
