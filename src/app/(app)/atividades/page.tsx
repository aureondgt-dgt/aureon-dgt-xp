import Link from "next/link";
import { requireMember } from "@/lib/auth";
import {
  getActivitiesView,
  getActivityTypes,
  getTeamWithStats,
  getXpHistory,
  withPositions,
} from "@/lib/queries";
import { formatDate, formatDateTime, formatNumber, timeAgo, todayISO } from "@/lib/xp";
import { ActivityForm, ReviewForm } from "@/components/forms";
import { Avatar, EmptyState, Flash, PageHeader, SectionCard, StatusPill } from "@/components/ui";
import { Icon } from "@/components/icons";
import { STATUS_LABELS } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "approved", label: "Aprovadas" },
  { key: "rejected", label: "Rejeitadas" },
];

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; msg?: string }>;
}) {
  const session = await requireMember();
  const { status = "all", msg } = await searchParams;
  const isAdmin = session.role === "admin";

  const [types, team, mine, feed, history] = await Promise.all([
    getActivityTypes(),
    getTeamWithStats(),
    getActivitiesView({ memberId: session.id, limit: 400 }),
    isAdmin ? getActivitiesView({ status, limit: 200 }) : getActivitiesView({ memberId: session.id, status, limit: 200 }),
    getXpHistory(session.id, 20),
  ]);
  const ranked = withPositions(team);
  const myStat = ranked.find((entry) => entry.id === session.id);
  const counts = {
    pending: mine.filter((activity) => activity.status === "pending").length,
    approved: mine.filter((activity) => activity.status === "approved").length,
    rejected: mine.filter((activity) => activity.status === "rejected").length,
  };

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Registro de atividades"
        title="Suas atividades"
        description="Registre o que você fez na Aureon. Cada atividade aprovada gera XP e aproxima você da próxima patente."
        action={
          <div className="flex flex-wrap gap-2">
            <span className="chip border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <Icon name="check" size={12} /> {counts.approved} aprovadas
            </span>
            <span className="chip border-amber-400/25 bg-amber-400/10 text-amber-300">
              <Icon name="clock" size={12} /> {counts.pending} pendentes
            </span>
            <span className="chip border-white/10 bg-white/5 text-white/50">{formatNumber(myStat?.totalXp ?? 0)} XP</span>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <SectionCard
            title={isAdmin ? "Todas as atividades da equipe" : "Histórico de atividades"}
            icon="briefcase"
            subtitle={isAdmin ? "Aprove ou rejeite registros pendentes. Você nunca aprova as próprias atividades." : "Acompanhe o status de cada registro enviado."}
            action={
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((filter) => (
                  <Link
                    key={filter.key}
                    href={`/atividades?status=${filter.key}`}
                    className={`rounded-md px-2 py-1 text-[0.65rem] font-medium transition ${
                      status === filter.key ? "bg-neon/20 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </Link>
                ))}
              </div>
            }
          >
            <div className="space-y-2.5">
              {feed.length === 0 ? (
                <EmptyState title="Nenhuma atividade neste filtro" description="Registre uma nova atividade para começar a acumular XP." icon="briefcase" />
              ) : (
                feed.map((activity) => (
                  <article key={activity.id} className="rounded-xl border border-white/7 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-3">
                      <Avatar name={activity.memberName} accent={activity.memberAccent} avatarUrl={activity.memberAvatarUrl} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-sm font-semibold text-white">{activity.title}</p>
                          <StatusPill status={activity.status} label={STATUS_LABELS[activity.status] ?? activity.status} />
                        </div>
                        <p className="mt-0.5 text-[0.68rem] text-white/40">
                          {activity.memberId === session.id ? "Você" : activity.memberName} • {activity.typeName} •{" "}
                          {formatDate(activity.occurredAt)} • {timeAgo(activity.createdAt)}
                        </p>
                        {activity.description ? (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/50">{activity.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem]">
                          {activity.proofUrl ? (
                            <a href={activity.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-neon-bright hover:text-white">
                              <Icon name="link" size={11} /> Comprovante
                            </a>
                          ) : null}
                          {activity.hasProof && !activity.proofUrl ? (
                            <a href={`/api/attachments/${activity.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-neon-bright hover:text-white">
                              <Icon name="download" size={11} /> {activity.proofName ?? "Anexo"}
                            </a>
                          ) : null}
                          {activity.reviewerName ? (
                            <span className="text-white/30">Avaliado por {activity.reviewerName}</span>
                          ) : null}
                          {activity.reviewNote ? <span className="text-white/30">• “{activity.reviewNote}”</span> : null}
                        </div>
                        {isAdmin && activity.status === "pending" ? (
                          <div className="mt-2.5 rounded-lg border border-white/8 bg-black/25 p-2">
                            <ReviewForm
                              activityId={activity.id}
                              redirectTo={`/atividades?status=${status}`}
                              selfReview={activity.memberId === session.id}
                              compact
                            />
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-sm font-semibold ${activity.status === "approved" ? "text-emerald-300" : "text-white/35"}`}>
                          {activity.status === "approved" ? `+${activity.xpAwarded}` : `+${activity.typeXp}`}
                          <span className="text-[0.6rem] font-normal text-white/35"> XP</span>
                        </p>
                        {activity.status === "pending" ? <p className="text-[0.58rem] text-amber-300/70">em análise</p> : null}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Histórico de XP recebido" icon="history" subtitle="Créditos de atividades, missões, conquistas e ajustes.">
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2">
                  <span
                    className={`flex size-7 items-center justify-center rounded-md border ${
                      entry.amount >= 0
                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                        : "border-rose-400/25 bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    <Icon name={entry.source === "mission" ? "target" : entry.source === "adjustment" ? "edit" : entry.source === "achievement" ? "medal" : "zap"} size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white/80">{entry.reason}</p>
                    <p className="text-[0.62rem] text-white/35">
                      {formatDateTime(entry.createdAt)} • {entry.source === "adjustment" ? `por ${entry.actorName ?? "administração"}` : entry.source === "activity" ? "atividade aprovada" : entry.source === "mission" ? "missão" : "conquista"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${entry.amount >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount} XP
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="xl:col-span-5">
          <div id="nova" className="card card-glow p-4 sm:p-5 xl:sticky xl:top-20">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-neon/30 bg-neon/12 text-neon-bright">
                <Icon name="plus" size={17} />
              </span>
              <div>
                <h2 className="text-[0.95rem] font-semibold text-white">Registrar nova atividade</h2>
                <p className="text-[0.7rem] text-white/40">Todo registro passa por aprovação antes de gerar XP.</p>
              </div>
            </div>
            <ActivityForm
              types={types.filter((type) => type.active).map((type) => ({ id: type.id, name: type.name, category: type.category, xp: type.xp, icon: type.icon }))}
              memberOptions={ranked.map((entry) => ({ id: entry.id, name: entry.name, jobTitle: entry.jobTitle }))}
              canAssign={isAdmin}
              currentMemberId={session.id}
              today={todayISO()}
            />
            <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/40">
                <Icon name="zap" size={11} /> Tabela de XP vigente
              </p>
              <div className="grid grid-cols-2 gap-1">
                {types.map((type) => (
                  <span key={type.id} className="truncate text-[0.62rem] text-white/45">
                    {type.name} <span className="text-emerald-300/80">+{type.xp}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[0.65rem] text-white/25">
        {feed.length} registros exibidos • {types.filter((type) => type.active).length} tipos de atividade ativos • aprovação obrigatória
      </p>
    </div>
  );
}
