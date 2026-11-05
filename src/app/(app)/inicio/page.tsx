import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { claimMissionAction } from "@/app/actions/missions";
import { formatDate, formatNumber, timeAgo } from "@/lib/xp";
import { Avatar, EmptyState, Flash, Progress, SectionCard, StatCard } from "@/components/ui";
import { AchievementBadge, RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";
import { XpProgressChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const data = await getDashboardData(session.id);
  const { me } = data;

  const productivity = Math.min(100, Math.round((me.weekXp / 600) * 100));
  const series = data.xpSeries.map((point) => ({
    date: String(point.date),
    value: Number(point[Number(me.id)] ?? 0),
  }));
  const topRanked = data.ranked.slice(0, 3);
  const unlocked = data.unlockedAchievements;
  const premiumMissions = data.todaysMissions.length ? data.todaysMissions : data.weeklyMissions.slice(0, 3);
  const firstRank = data.ranks[0];
  const lastRank = data.ranks.at(-1);
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  return (
    <div className="space-y-4 sm:space-y-5">
      <Flash message={msg} />

      <section className="relative overflow-hidden rounded-2xl border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "url('/images/aureon-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/85 to-ink-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-4 px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-white/45">
            <span className="size-1.5 animate-pulse-glow rounded-full bg-neon" />
            {today}
          </div>
          <div>
            <p className="text-sm font-medium text-white/60">Bem-vindo de volta,</p>
            <h1 className="mt-0.5 flex flex-wrap items-center gap-2 text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">
              {session.name}!
              <span className="inline-flex items-center gap-1 rounded-full border border-neon/30 bg-neon/10 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-neon-bright">
                <Icon name="sparkles" size={11} /> {me.rank.name}
              </span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/55">
              Continue evoluindo e fazendo a Aureon ainda maior. Você está no nível {me.level} com {formatNumber(me.totalXp)} XP.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/atividades" className="btn-primary">
              <Icon name="plus" size={15} /> Registrar atividade
            </Link>
            <Link href="/missoes" className="btn-ghost">
              <Icon name="target" size={15} /> Ver missões
            </Link>
            <span className="chip ml-auto border-white/10 bg-black/30 text-white/60">
              <Icon name="users" size={12} /> {data.ranked.length} integrantes ativos
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card relative overflow-hidden p-4 sm:p-5">
            <div className="pointer-events-none absolute -left-20 -top-24 size-56 rounded-full bg-neon/15 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative">
                {me.position === 1 ? (
                  <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-amber-300">
                    <Icon name="crown" size={20} />
                  </span>
                ) : null}
                <Avatar name={me.name} accent={me.accent} avatarUrl={me.avatarUrl} size={78} ring={me.rank.color} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-white">{me.name}</h2>
                  <span className="flex size-4 items-center justify-center rounded-full bg-neon text-white">
                    <Icon name="check" size={10} strokeWidth={3} />
                  </span>
                  <span className="chip border-neon/30 bg-neon/12 text-neon-bright">
                    <Icon name="star" size={11} /> Nível {me.level}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-white/50">{me.jobTitle}</p>
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[0.7rem]">
                    <span className="text-white/45">
                      {formatNumber(me.intoLevel)} / {formatNumber(me.needed)} XP para o nível {me.level + 1}
                    </span>
                    <span className="font-semibold text-neon-bright">{me.levelPct}%</span>
                  </div>
                  <Progress value={me.levelPct} height={9} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="XP Atual" value={formatNumber(me.totalXp)} hint="Experiência total" icon="zap" index={0} />
            <StatCard
              label="Ranking"
              value={`#${me.position}`}
              hint={`entre ${data.ranked.length} integrantes`}
              icon="trophy"
              color="#fbbf24"
              index={1}
            />
            <StatCard label="Produtividade" value={`${productivity}%`} hint="XP nesta semana" icon="chart" color="#c084fc" index={2} />
            <StatCard label="Dias Ativos" value={me.activeDays} hint="Últimos 30 dias" icon="flame" color="#fb923c" index={3} />
          </div>
        </div>

        <SectionCard title="Sua Patente" icon="crown" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-neon/15 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <RankEmblem tier={me.rank.tier} color={me.rank.color} size={96} />
            <div className="min-w-0">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-white/40">Patente atual</p>
              <p className="text-2xl font-semibold tracking-tight text-white">{me.rank.name}</p>
              <p className="mt-1 text-[0.7rem] leading-relaxed text-white/45">{me.rank.description}</p>
            </div>
          </div>
          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[0.68rem]">
              <span className="text-white/45">
                {me.nextRank ? `Próxima patente: ${me.nextRank.name}` : "Patente máxima alcançada"}
              </span>
              <span className="font-semibold text-white/70">
                {formatNumber(me.totalXp)} / {me.nextRank ? formatNumber(me.nextRank.minXp) : formatNumber(lastRank?.minXp ?? me.totalXp)}
              </span>
            </div>
            <Progress value={me.rankPct} height={7} color={me.rank.color} />
          </div>
          <div className="relative mt-3 flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[0.68rem]">
            <span className="text-white/40">Início da jornada</span>
            <span className="flex items-center gap-1.5 font-medium text-white/70">
              <Icon name="medal" size={12} className="text-neon-bright" /> {firstRank?.name ?? "Recruta"}
            </span>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard
          title="Missões de Hoje"
          icon="target"
          className="xl:col-span-4"
          action={<span className="chip border-white/10 bg-white/5 text-white/50">{premiumMissions.filter((mission) => !mission.claimed).length} restantes</span>}
        >
          <div className="space-y-2">
            {premiumMissions.length === 0 ? (
              <EmptyState title="Nenhuma missão ativa" description="Novas missões serão publicadas pela administração." icon="target" />
            ) : (
              premiumMissions.map((mission) => (
                <div key={mission.id} className="rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        mission.claimed
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                          : "border-white/15 text-white/25"
                      }`}
                    >
                      {mission.claimed ? <Icon name="check" size={11} /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[0.8rem] leading-snug ${mission.claimed ? "text-white/45 line-through" : "text-white/85"}`}>
                        {mission.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={mission.pct} height={4} className="max-w-[110px]" color={mission.completed ? "#34d399" : "#a259ff"} />
                        <span className="text-[0.6rem] text-white/35">
                          {Math.min(mission.progress, mission.target)}/{mission.target}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[0.72rem] font-semibold text-emerald-300">+{mission.xpReward} XP</p>
                      {mission.canClaim ? (
                        <form action={claimMissionAction}>
                          <input type="hidden" name="missionId" value={mission.id} />
                          <button type="submit" className="mt-1 rounded-md bg-neon px-2 py-0.5 text-[0.6rem] font-semibold text-white hover:brightness-110">
                            Resgatar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {data.weeklyMissions.length ? (
            <div className="mt-4 border-t border-white/8 pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                <Icon name="calendar" size={12} /> Metas da semana
              </p>
              <div className="space-y-2">
                {data.weeklyMissions.slice(0, 2).map((mission) => (
                  <div key={mission.id}>
                    <div className="mb-1 flex items-center justify-between text-[0.7rem]">
                      <span className="truncate pr-2 text-white/60">{mission.title}</span>
                      <span className="shrink-0 text-white/40">
                        {Math.min(mission.progress, mission.target)}/{mission.target}
                      </span>
                    </div>
                    <Progress value={mission.pct} height={4} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <Link href="/missoes" className="btn-primary mt-4 w-full">
            <Icon name="play" size={13} /> Ver todas as missões
          </Link>
        </SectionCard>

        <SectionCard title="Seu Progresso" icon="chart" className="xl:col-span-5" action={<span className="text-[0.65rem] text-white/35">XP acumulado</span>}>
          <XpProgressChart data={series} accent={me.accent} />
        </SectionCard>

        <SectionCard
          title="Ranking da Equipe"
          icon="trophy"
          className="xl:col-span-3"
          action={<Link href="/ranking" className="text-[0.68rem] font-medium text-neon-bright hover:text-white">Ver ranking</Link>}
        >
          <div className="space-y-2">
            {topRanked.map((entry) => {
              const isMe = entry.id === me.id;
              return (
                <Link
                  key={entry.id}
                  href={`/equipe/${entry.id}`}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 transition hover:border-neon/40 ${
                    isMe ? "border-neon/40 bg-neon/10" : "border-white/7 bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md text-[0.7rem] font-bold ${
                      entry.position === 1
                        ? "bg-amber-400/15 text-amber-300"
                        : entry.position === 2
                          ? "bg-slate-300/10 text-slate-200"
                          : "bg-orange-400/15 text-orange-300"
                    }`}
                  >
                    {entry.position}
                  </span>
                  <Avatar name={entry.name} accent={entry.accent} avatarUrl={entry.avatarUrl} size={32} ring={isMe ? entry.rank.color : null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {entry.name}
                      {isMe ? <span className="ml-1 text-[0.6rem] font-normal text-neon-bright">Você</span> : null}
                    </p>
                    <p className="truncate text-[0.62rem] text-white/40">
                      Nível {entry.level} • {formatNumber(entry.totalXp)} XP
                    </p>
                  </div>
                  {entry.position === 1 ? <Icon name="crown" size={14} className="text-amber-300" /> : <Icon name="medal" size={13} className="text-white/25" />}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-white/35">Sua posição</p>
            <p className="mt-0.5 flex items-baseline gap-1.5 text-lg font-semibold text-white">
              #{me.position}
              <span className="text-[0.65rem] font-normal text-white/40">
                faltam {Math.max(0, (data.ranked[me.position - 2]?.totalXp ?? me.totalXp) - me.totalXp)} XP para subir
              </span>
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard
          title="Conquistas"
          icon="medal"
          className="xl:col-span-7"
          action={<Link href="/conquistas" className="text-[0.68rem] font-medium text-neon-bright hover:text-white">Ver todas</Link>}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {data.achievements.slice(0, 6).map((achievement) => (
              <div key={achievement.id} className="flex flex-col items-center gap-1.5 text-center">
                <AchievementBadge icon={achievement.icon} rarity={achievement.rarity} unlocked={Boolean(achievement.unlockedAt)} size={58} />
                <p className="line-clamp-2 text-[0.62rem] leading-tight text-white/55">{achievement.name}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.65rem] text-white/35">
            {unlocked.length} de {data.achievements.length} conquistas desbloqueadas
          </p>
        </SectionCard>

        <SectionCard
          title="Atividade Recente"
          icon="zap"
          className="xl:col-span-5"
          action={<Link href="/atividades" className="text-[0.68rem] font-medium text-neon-bright hover:text-white">Ver histórico</Link>}
        >
          <div className="space-y-2.5">
            {data.recentActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border ${
                    activity.status === "approved"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                      : activity.status === "pending"
                        ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                        : "border-rose-400/25 bg-rose-400/10 text-rose-300"
                  }`}
                >
                  <Icon name={activity.status === "approved" ? "check" : activity.status === "pending" ? "clock" : "x"} size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.76rem] text-white/80">
                    {activity.memberId === session.id ? "Você" : activity.memberName} • {activity.title}
                  </p>
                  <p className="text-[0.62rem] text-white/35">
                    {activity.typeName} • {formatDate(activity.occurredAt)} • {timeAgo(activity.createdAt)}
                  </p>
                </div>
                <span className={`shrink-0 text-[0.7rem] font-semibold ${activity.status === "approved" ? "text-emerald-300" : "text-white/30"}`}>
                  {activity.status === "approved" ? `+${activity.xpAwarded} XP` : activity.status === "pending" ? "pendente" : "—"}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
