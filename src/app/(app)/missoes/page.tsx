import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getMissionsView, getTeamWithStats } from "@/lib/queries";
import { claimMissionAction } from "@/app/actions/missions";
import { formatDate, formatNumber } from "@/lib/xp";
import { METRIC_LABELS, MISSION_TYPE_LABELS } from "@/lib/metrics";
import { EmptyState, Flash, PageHeader, Progress, SectionCard, StatCard } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const GROUPS: Array<{ type: string; title: string; icon: "target" | "calendar" | "trend" | "sparkles" | "users"; description: string }> = [
  { type: "daily", title: "Missões diárias", icon: "target", description: "Rituais rápidos para manter o ritmo diário." },
  { type: "weekly", title: "Missões semanais", icon: "calendar", description: "Metas de curto prazo com recompensas maiores." },
  { type: "monthly", title: "Missões mensais", icon: "trend", description: "Objetivos de consistência ao longo do mês." },
  { type: "special", title: "Missões especiais", icon: "sparkles", description: "Desafios temporários criados pela administração." },
  { type: "collective", title: "Metas coletivas da Aureon", icon: "users", description: "Resultados que só acontecem com a equipe unida." },
];

export default async function MissionsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const [missions, team] = await Promise.all([getMissionsView(session.id), getTeamWithStats()]);
  const active = missions.filter((mission) => mission.status === "active");
  const claimed = active.filter((mission) => mission.claimed);
  const ready = active.filter((mission) => mission.canClaim);
  const totalReward = active.reduce((sum, mission) => sum + (mission.claimed ? 0 : mission.xpReward), 0);
  const teamXp = team.reduce((sum, member) => sum + member.weekXp, 0);

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Missões e metas"
        title="Central de missões"
        description="Complete missões, resgate recompensas em XP e contribua com as metas coletivas da Aureon."
        action={
          <Link href="/atividades" className="btn-primary">
            <Icon name="plus" size={15} /> Registrar atividade
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Missões ativas" value={active.length} hint="Disponíveis agora" icon="target" index={0} />
        <StatCard label="Prontas para resgate" value={ready.length} hint="Concluídas sem resgate" icon="check" color="#34d399" index={1} />
        <StatCard label="Resgatadas" value={claimed.length} hint="Recompensas creditadas" icon="medal" color="#fbbf24" index={2} />
        <StatCard label="XP em jogo" value={formatNumber(totalReward)} hint={`${formatNumber(teamXp)} XP da equipe na semana`} icon="zap" color="#c084fc" index={3} />
      </div>

      {GROUPS.map((group) => {
        const items = missions.filter((mission) =>
          group.type === "collective"
            ? mission.scope === "collective" || mission.type === "collective"
            : mission.scope !== "collective" && mission.type === group.type,
        );
        return (
          <SectionCard
            key={group.type}
            title={group.title}
            icon={group.icon}
            subtitle={group.description}
            action={<span className="chip border-white/10 bg-white/5 text-white/45">{items.length} missões</span>}
          >
            {items.length === 0 ? (
              <EmptyState icon="target" title="Nenhuma missão nesta categoria" description="A administração publica novas missões periodicamente." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((mission) => {
                  const expired = mission.expired && !mission.completed;
                  return (
                    <article
                      key={mission.id}
                      className={`relative flex flex-col gap-2 rounded-xl border p-3.5 transition ${
                        mission.claimed
                          ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                          : mission.canClaim
                            ? "border-neon/40 bg-neon/[0.07]"
                            : expired
                              ? "border-white/6 bg-white/[0.01] opacity-70"
                              : "border-white/8 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="chip border-white/10 bg-white/5 text-[0.6rem] uppercase tracking-[0.1em] text-white/50">
                            {mission.scope === "collective" ? "Coletiva" : MISSION_TYPE_LABELS[mission.type]}
                          </span>
                          {mission.claimed ? (
                            <span className="chip border-emerald-400/30 bg-emerald-400/10 text-[0.6rem] text-emerald-300">Resgatada</span>
                          ) : expired ? (
                            <span className="chip border-white/10 bg-white/5 text-[0.6rem] text-white/40">Expirada</span>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-emerald-300">+{mission.xpReward} XP</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold leading-snug text-white">{mission.title}</h3>
                        {mission.description ? <p className="mt-1 text-[0.7rem] leading-relaxed text-white/45">{mission.description}</p> : null}
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-[0.65rem]">
                          <span className="text-white/40">{METRIC_LABELS[mission.metric] ?? mission.metric}</span>
                          <span className="font-semibold text-white/70">
                            {Math.min(mission.progress, mission.target)}/{mission.target}
                          </span>
                        </div>
                        <Progress value={mission.pct} height={5} color={mission.completed ? "#34d399" : "#a259ff"} />
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <span className="flex items-center gap-1 text-[0.62rem] text-white/35">
                          <Icon name="calendar" size={11} /> até {formatDate(mission.endsAt)}
                        </span>
                        {mission.canClaim ? (
                          <form action={claimMissionAction}>
                            <input type="hidden" name="missionId" value={mission.id} />
                            <button type="submit" className="rounded-lg bg-neon px-2.5 py-1 text-[0.68rem] font-semibold text-white transition hover:brightness-110">
                              Resgatar +{mission.xpReward} XP
                            </button>
                          </form>
                        ) : mission.claimed ? (
                          <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-emerald-300">
                            <Icon name="check" size={11} /> concluída
                          </span>
                        ) : mission.completed ? (
                          <span className="text-[0.65rem] text-white/40">Aguardando liberação</span>
                        ) : (
                          <span className="text-[0.65rem] text-white/30">faltam {mission.target - mission.progress}</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
