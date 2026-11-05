import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getRanking, getMissionsView } from "@/lib/queries";
import { formatNumber } from "@/lib/xp";
import { Avatar, Flash, PageHeader, Progress, SectionCard, StatCard } from "@/components/ui";
import { RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const [{ ranked }, missions] = await Promise.all([getRanking(), getMissionsView(session.id)]);
  const totalXp = ranked.reduce((sum, entry) => sum + entry.totalXp, 0);
  const averageLevel = ranked.length ? Math.round(ranked.reduce((sum, entry) => sum + entry.level, 0) / ranked.length) : 0;
  const topRank = [...ranked].sort((a, b) => b.rank.tier - a.rank.tier)[0];
  const collective = missions.filter((mission) => mission.scope === "collective" && mission.status === "active");

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Time Aureon"
        title="Equipe"
        description="Os sócios e integrantes que constroem a Aureon todos os dias. Cada perfil é uma trajetória real de evolução."
        action={
          session.role === "admin" ? (
            <Link href="/admin?tab=integrantes" className="btn-primary">
              <Icon name="plus" size={15} /> Adicionar integrante
            </Link>
          ) : (
            <span className="chip border-white/10 bg-white/5 text-white/50">
              <Icon name="lock" size={12} /> Cadastro controlado pela administração
            </span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Integrantes ativos" value={ranked.length} hint="Aureon Group" icon="users" index={0} />
        <StatCard label="XP coletivo" value={formatNumber(totalXp)} hint="Somatório histórico" icon="zap" color="#c084fc" index={1} />
        <StatCard label="Nível médio" value={averageLevel} hint="Evolução da equipe" icon="trend" color="#34d399" index={2} />
        <StatCard label="Patente mais alta" value={topRank?.rank.name ?? "—"} hint={topRank?.name ?? ""} icon="crown" color="#fbbf24" index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {ranked.map((member) => (
          <article key={member.id} className="card group relative overflow-hidden p-4">
            <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-neon/10 blur-3xl transition group-hover:bg-neon/20" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={54} ring={member.rank.color} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-white">{member.name}</h2>
                    {member.id === session.id ? <span className="chip border-neon/30 bg-neon/10 text-[0.55rem] text-neon-bright">você</span> : null}
                  </div>
                  <p className="text-[0.68rem] text-white/45">{member.jobTitle}</p>
                  <p className="mt-0.5 text-[0.62rem] text-white/30">
                    {member.role === "admin" ? "Administrador" : "Integrante"} • {member.activeDays} dias ativos
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[0.62rem] text-white/50">
                <Icon name="trophy" size={10} /> #{member.position}
              </span>
            </div>

            <div className="relative mt-3 flex items-center gap-2">
              <RankEmblem tier={member.rank.tier} color={member.rank.color} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[0.65rem]">
                  <span className="text-white/55">Nível {member.level}</span>
                  <span className="font-semibold text-white">{formatNumber(member.totalXp)} XP</span>
                </div>
                <Progress value={member.levelPct} height={4} color={member.accent} className="mt-1" />
              </div>
            </div>

            <div className="relative mt-3 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg border border-white/6 bg-white/[0.02] py-1.5">
                <p className="text-[0.7rem] font-semibold text-white">{member.approvedCount}</p>
                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-white/35">atividades</p>
              </div>
              <div className="rounded-lg border border-white/6 bg-white/[0.02] py-1.5">
                <p className="text-[0.7rem] font-semibold text-emerald-300">+{formatNumber(member.weekXp)}</p>
                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-white/35">XP semana</p>
              </div>
              <div className="rounded-lg border border-white/6 bg-white/[0.02] py-1.5">
                <p className="text-[0.7rem] font-semibold" style={{ color: member.rank.color }}>
                  {member.rank.name}
                </p>
                <p className="text-[0.55rem] uppercase tracking-[0.08em] text-white/35">patente</p>
              </div>
            </div>

            <Link
              href={`/equipe/${member.id}`}
              className="btn-ghost relative mt-3 w-full py-1.5 text-[0.7rem]"
            >
              Ver perfil completo <Icon name="arrow-right" size={12} />
            </Link>
          </article>
        ))}
      </div>

      {collective.length ? (
        <SectionCard title="Metas coletivas em andamento" icon="users" subtitle="Resultados que dependem de toda a equipe.">
          <div className="grid gap-3 md:grid-cols-2">
            {collective.map((mission) => (
              <div key={mission.id} className="rounded-xl border border-white/7 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">{mission.title}</p>
                  <span className="chip border-emerald-400/25 bg-emerald-400/10 text-[0.6rem] text-emerald-300">+{mission.xpReward} XP cada</span>
                </div>
                <p className="mt-1 text-[0.68rem] text-white/40">{mission.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={mission.pct} height={5} className="flex-1" />
                  <span className="text-[0.62rem] text-white/45">
                    {Math.min(mission.progress, mission.target)}/{mission.target}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
