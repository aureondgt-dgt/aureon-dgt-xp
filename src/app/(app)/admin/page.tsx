import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  getActivitiesView,
  getAdminCollections,
  getAdminOverview,
  getAuditLogs,
  getTeamWithStats,
} from "@/lib/queries";
import {
  adjustXpAction,
  createAchievementAction,
  createMemberAction,
  createMissionAction,
  deleteMissionAction,
  recalculateAchievementsAction,
  resetMemberPasswordAction,
  saveActivityTypeAction,
  saveRankAction,
  setMissionStatusAction,
  toggleAchievementAction,
  updateMemberAction,
  updateMissionAction,
} from "@/app/actions/admin";
import { CopyButton, ReviewForm, SubmitButton } from "@/components/forms";
import { Avatar, Flash, PageHeader, Progress, SectionCard, StatCard, StatusPill } from "@/components/ui";
import { AchievementBadge, RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";
import { addDaysISO, formatDate, formatDateTime, formatNumber, todayISO } from "@/lib/xp";
import { ACHIEVEMENT_CONDITION_LABELS, METRIC_LABELS, MISSION_TYPE_LABELS, STATUS_LABELS } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "visao", label: "Visão geral", icon: "chart" as const },
  { key: "aprovacoes", label: "Aprovações", icon: "check" as const },
  { key: "integrantes", label: "Integrantes", icon: "users" as const },
  { key: "missoes", label: "Missões", icon: "target" as const },
  { key: "tipos", label: "XP por atividade", icon: "zap" as const },
  { key: "patentes", label: "Patentes", icon: "crown" as const },
  { key: "conquistas", label: "Conquistas", icon: "medal" as const },
  { key: "ajustes", label: "Ajustes de XP", icon: "edit" as const },
  { key: "auditoria", label: "Auditoria", icon: "history" as const },
];

const ICON_OPTIONS = ["zap", "target", "handshake", "calendar", "rocket", "code", "check", "compass", "pen", "shield", "globe", "diamond", "growth", "flame", "star", "crown", "trophy", "medal"];
const ACCENTS = ["#a259ff", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#c084fc", "#f97316"];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; msg?: string; pwd?: string }>;
}) {
  const admin = await requireAdmin();
  const { tab = "visao", msg, pwd } = await searchParams;
  const [overview, collections, pending, recent, logs, team] = await Promise.all([
    getAdminOverview(),
    getAdminCollections(),
    getActivitiesView({ status: "pending", limit: 100 }),
    getActivitiesView({ limit: 25 }),
    getAuditLogs(60),
    getTeamWithStats(),
  ]);

  const adjustments = logs.filter((log) => log.action === "xp.adjusted");
  const activeTab = TABS.some((item) => item.key === tab) ? tab : "visao";

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Painel administrativo"
        title="Administração Aureon XP"
        description="Controle de aprovações, integrantes, missões, patentes, conquistas e pontuações da plataforma."
        action={
          <div className="flex flex-wrap gap-2">
            <span className="chip border-neon/25 bg-neon/10 text-neon-bright">
              <Icon name="shield" size={12} /> {admin.name}
            </span>
            <span className="chip border-amber-400/25 bg-amber-400/10 text-amber-300">
              <Icon name="clock" size={12} /> {overview.pendingCount} pendentes
            </span>
          </div>
        }
      />

      {pwd ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 text-xs text-emerald-200">
          <Icon name="lock" size={14} />
          Senha temporária gerada: <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-emerald-100">{pwd}</code>
          <CopyButton value={pwd} label="Copiar senha" />
          <span className="text-emerald-200/60">O integrante deve alterá-la em Configurações.</span>
        </div>
      ) : null}

      <div className="hide-scrollbar -mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin?tab=${item.key}`}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.72rem] font-medium transition ${
              activeTab === item.key
                ? "border-neon/40 bg-neon/15 text-white"
                : "border-white/8 bg-white/[0.02] text-white/50 hover:text-white"
            }`}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
            {item.key === "aprovacoes" && overview.pendingCount ? (
              <span className="rounded-full bg-amber-400/20 px-1.5 text-[0.6rem] font-bold text-amber-300">{overview.pendingCount}</span>
            ) : null}
          </Link>
        ))}
      </div>

      {activeTab === "visao" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="XP distribuído" value={formatNumber(overview.totalXp)} hint="Histórico da empresa" icon="zap" index={0} />
            <StatCard label="Integrantes" value={team.length} hint={`${team.filter((member) => member.status === "active").length} ativos`} icon="users" color="#38bdf8" index={1} />
            <StatCard label="Atividades aprovadas" value={overview.approved} hint="Total validado" icon="check" color="#34d399" index={2} />
            <StatCard label="Pendentes" value={overview.pending} hint="Aguardando revisão" icon="clock" color="#fbbf24" index={3} />
          </div>

          <div className="grid gap-4 xl:grid-cols-12">
            <SectionCard title="Desempenho da equipe" icon="chart" className="xl:col-span-7">
              <div className="space-y-2.5">
                {overview.team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
                    <span className="flex size-6 items-center justify-center rounded-md bg-white/5 text-[0.68rem] font-bold text-white/60">
                      {member.position}
                    </span>
                    <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={34} ring={member.rank.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">
                        {member.name} <span className="font-normal text-white/35">• {member.jobTitle}</span>
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Progress value={member.levelPct} height={4} className="max-w-[140px]" color={member.accent} />
                        <span className="text-[0.6rem] text-white/35">
                          Nv {member.level} • {member.rank.name}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-white">{formatNumber(member.totalXp)} XP</p>
                      <p className="text-[0.6rem] text-white/35">
                        {member.pendingCount} pend. • +{formatNumber(member.weekXp)} semana
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="space-y-4 xl:col-span-5">
              <SectionCard title="Aprovações urgentes" icon="clock" action={<Link href="/admin?tab=aprovacoes" className="text-[0.68rem] text-neon-bright">Abrir fila</Link>}>
                {pending.length === 0 ? (
                  <p className="text-xs text-white/35">Nenhuma atividade pendente. Excelente trabalho.</p>
                ) : (
                  <div className="space-y-2">
                    {pending.slice(0, 4).map((activity) => (
                      <div key={activity.id} className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/[0.02] p-2">
                        <Avatar name={activity.memberName} accent={activity.memberAccent} avatarUrl={activity.memberAvatarUrl} size={26} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.72rem] text-white/80">{activity.title}</p>
                          <p className="text-[0.6rem] text-white/35">
                            {activity.memberName} • {activity.typeName} • {formatDate(activity.occurredAt)}
                          </p>
                        </div>
                        <span className="text-[0.65rem] font-semibold text-emerald-300">+{activity.typeXp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Últimas alterações" icon="history" action={<Link href="/admin?tab=auditoria" className="text-[0.68rem] text-neon-bright">Ver tudo</Link>}>
                <div className="space-y-2">
                  {overview.logs.slice(0, 4).map((log) => (
                    <div key={log.id} className="rounded-lg border border-white/6 bg-white/[0.015] px-2.5 py-2">
                      <p className="text-[0.68rem] leading-relaxed text-white/60">{log.details}</p>
                      <p className="mt-0.5 text-[0.58rem] text-white/25">
                        {log.actorName ?? "Sistema"} • {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "aprovacoes" ? (
        <div className="space-y-4">
          <SectionCard title="Fila de aprovação" icon="check" subtitle="Aprovar concede o XP automaticamente. Você não pode aprovar as próprias atividades." action={<span className="chip border-amber-400/25 bg-amber-400/10 text-amber-300">{pending.length} aguardando</span>}>
            {pending.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/35">Nenhuma atividade pendente no momento.</p>
            ) : (
              <div className="space-y-2.5">
                {pending.map((activity) => (
                  <article key={activity.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar name={activity.memberName} accent={activity.memberAccent} avatarUrl={activity.memberAvatarUrl} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{activity.title}</p>
                          <span className="chip border-white/10 bg-white/5 text-[0.6rem] text-white/50">{activity.typeName}</span>
                          {activity.memberId === admin.id ? (
                            <span className="chip border-amber-400/25 bg-amber-400/10 text-[0.6rem] text-amber-300">sua atividade</span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[0.65rem] text-white/40">
                          {activity.memberName} • {activity.category} • {formatDate(activity.occurredAt)} • registrada {formatDateTime(activity.createdAt)}
                        </p>
                        {activity.description ? <p className="mt-1.5 text-xs leading-relaxed text-white/50">{activity.description}</p> : null}
                        {activity.proofUrl || activity.hasProof ? (
                          <a
                            href={activity.proofUrl ?? `/api/attachments/${activity.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-[0.65rem] text-neon-bright hover:text-white"
                          >
                            <Icon name="link" size={11} /> Ver comprovante {activity.proofName ? `• ${activity.proofName}` : ""}
                          </a>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-emerald-300">+{activity.typeXp} XP</span>
                    </div>
                    <div className="mt-2.5 rounded-lg border border-white/8 bg-black/25 p-2">
                      <ReviewForm activityId={activity.id} redirectTo="/admin?tab=aprovacoes" selfReview={activity.memberId === admin.id} compact />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Últimas avaliações" icon="history">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="text-[0.6rem] uppercase tracking-[0.12em] text-white/35">
                    <th className="px-2 py-2 font-medium">Atividade</th>
                    <th className="px-2 py-2 font-medium">Integrante</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">XP</th>
                    <th className="px-2 py-2 font-medium">Avaliador</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.filter((activity) => activity.status !== "pending").slice(0, 12).map((activity) => (
                    <tr key={activity.id} className="border-t border-white/6">
                      <td className="px-2 py-2 text-[0.72rem] text-white/75">{activity.title}</td>
                      <td className="px-2 py-2 text-[0.7rem] text-white/45">{activity.memberName}</td>
                      <td className="px-2 py-2"><StatusPill status={activity.status} label={STATUS_LABELS[activity.status] ?? activity.status} /></td>
                      <td className="px-2 py-2 text-[0.7rem] text-white/60">{activity.xpAwarded}</td>
                      <td className="px-2 py-2 text-[0.7rem] text-white/40">{activity.reviewerName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "integrantes" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <SectionCard title="Adicionar integrante" icon="plus" className="xl:col-span-4" subtitle="O cadastro é exclusivo da administração.">
            <form action={createMemberAction} className="space-y-3">
              <div>
                <span className="label">Nome</span>
                <input name="name" className="input" required placeholder="Nome do integrante" />
              </div>
              <div>
                <span className="label">E-mail corporativo</span>
                <input name="email" type="email" className="input" required placeholder="nome@aureon.com" />
              </div>
              <div>
                <span className="label">Cargo</span>
                <input name="jobTitle" className="input" placeholder="Ex.: Sócio • Comercial" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Permissão</span>
                  <select name="role" className="input" defaultValue="member">
                    <option value="member">Integrante</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <span className="label">Cor</span>
                  <select name="accent" className="input" defaultValue="#38bdf8">
                    {ACCENTS.map((accent) => (
                      <option key={accent} value={accent}>{accent}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <span className="label">Senha inicial (opcional)</span>
                <input name="password" className="input" placeholder="Deixe em branco para gerar" minLength={6} />
              </div>
              <SubmitButton className="btn-primary w-full" icon={<Icon name="plus" size={15} />}>
                Criar conta
              </SubmitButton>
            </form>
          </SectionCard>

          <div className="space-y-3 xl:col-span-8">
            {team.map((member) => (
              <div key={member.id} className="card p-3.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={42} ring={member.rank.color} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      {member.name}
                      {member.role === "admin" ? <Icon name="shield" size={12} className="text-neon-bright" /> : null}
                      {member.status !== "active" ? <span className="chip border-rose-400/25 bg-rose-400/10 text-[0.55rem] text-rose-300">inativo</span> : null}
                    </p>
                    <p className="text-[0.68rem] text-white/40">
                      {member.email} • {member.jobTitle}
                    </p>
                    <p className="text-[0.62rem] text-white/30">
                      Nv {member.level} • {member.rank.name} • {formatNumber(member.totalXp)} XP • {member.approvedCount} atividades
                    </p>
                  </div>
                  <form action={resetMemberPasswordAction}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <button type="submit" className="btn-ghost px-2.5 py-1.5 text-[0.65rem]">
                      <Icon name="lock" size={11} /> Redefinir senha
                    </button>
                  </form>
                </div>
                <details className="mt-2.5 rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
                  <summary className="cursor-pointer text-[0.68rem] font-medium text-white/55">Editar dados e permissões</summary>
                  <form action={updateMemberAction} className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="memberId" value={member.id} />
                    <div>
                      <span className="label">Nome</span>
                      <input name="name" defaultValue={member.name} className="input" required />
                    </div>
                    <div>
                      <span className="label">Cargo</span>
                      <input name="jobTitle" defaultValue={member.jobTitle} className="input" required />
                    </div>
                    <div>
                      <span className="label">Permissão</span>
                      <select name="role" defaultValue={member.role} className="input">
                        <option value="member">Integrante</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <span className="label">Status</span>
                      <select name="status" defaultValue={member.status} className="input">
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                    <div>
                      <span className="label">Cor</span>
                      <select name="accent" defaultValue={member.accent} className="input">
                        {ACCENTS.map((accent) => (
                          <option key={accent} value={accent}>{accent}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <SubmitButton className="btn-primary w-full py-1.5 text-[0.72rem]" pendingLabel="Salvando...">Salvar</SubmitButton>
                    </div>
                  </form>
                </details>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "missoes" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <SectionCard title="Criar missão" icon="target" className="xl:col-span-4" subtitle="A equipe é notificada automaticamente.">
            <form action={createMissionAction} className="space-y-3">
              <div>
                <span className="label">Título</span>
                <input name="title" className="input" required placeholder="Ex.: Caçador de contratos" />
              </div>
              <div>
                <span className="label">Descrição</span>
                <textarea name="description" rows={2} className="input resize-none" placeholder="Objetivo da missão" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Tipo</span>
                  <select name="type" className="input" defaultValue="daily">
                    {Object.entries(MISSION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="label">Escopo</span>
                  <select name="scope" className="input" defaultValue="individual">
                    <option value="individual">Individual</option>
                    <option value="collective">Coletiva</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="label">Métrica</span>
                <select name="metric" className="input" defaultValue="activities">
                  {Object.entries(METRIC_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Meta</span>
                  <input name="target" type="number" min={1} defaultValue={1} className="input" required />
                </div>
                <div>
                  <span className="label">Recompensa XP</span>
                  <input name="xpReward" type="number" min={1} defaultValue={100} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Início</span>
                  <input name="startsAt" type="date" defaultValue={todayISO()} className="input" required />
                </div>
                <div>
                  <span className="label">Fim</span>
                  <input name="endsAt" type="date" defaultValue={addDaysISO(7)} className="input" required />
                </div>
              </div>
              <SubmitButton className="btn-primary w-full" icon={<Icon name="plus" size={15} />}>Publicar missão</SubmitButton>
            </form>
          </SectionCard>

          <SectionCard title="Missões cadastradas" icon="calendar" className="xl:col-span-8" action={<span className="chip border-white/10 bg-white/5 text-white/45">{collections.missions.length}</span>}>
            <div className="space-y-2">
              {collections.missions.map((mission) => (
                <div key={mission.id} className="rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={mission.status} label={STATUS_LABELS[mission.status] ?? mission.status} />
                    <span className="chip border-white/10 bg-white/5 text-[0.6rem] text-white/50">{MISSION_TYPE_LABELS[mission.type]}</span>
                    <span className="chip border-white/10 bg-white/5 text-[0.6rem] text-white/50">{mission.scope === "collective" ? "coletiva" : "individual"}</span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{mission.title}</p>
                    <span className="text-[0.68rem] text-white/40">
                      {METRIC_LABELS[mission.metric]} {mission.target} • +{mission.xpReward} XP
                    </span>
                  </div>
                  <p className="mt-1 text-[0.62rem] text-white/30">
                    {formatDate(mission.startsAt)} → {formatDate(mission.endsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={setMissionStatusAction}>
                      <input type="hidden" name="missionId" value={mission.id} />
                      <input type="hidden" name="status" value={mission.status === "active" ? "closed" : "active"} />
                      <button type="submit" className="btn-ghost px-2 py-1 text-[0.62rem]">
                        <Icon name={mission.status === "active" ? "x" : "check"} size={11} />
                        {mission.status === "active" ? "Encerrar" : "Reativar"}
                      </button>
                    </form>
                    <form action={deleteMissionAction}>
                      <input type="hidden" name="missionId" value={mission.id} />
                      <button type="submit" className="btn-ghost px-2 py-1 text-[0.62rem] text-rose-300">
                        <Icon name="trash" size={11} /> Excluir
                      </button>
                    </form>
                    <details className="w-full">
                      <summary className="cursor-pointer text-[0.62rem] text-white/40">Editar missão</summary>
                      <form action={updateMissionAction} className="mt-2 grid gap-2 sm:grid-cols-2">
                        <input type="hidden" name="missionId" value={mission.id} />
                        <div>
                          <span className="label">Título</span>
                          <input name="title" defaultValue={mission.title} className="input" required />
                        </div>
                        <div>
                          <span className="label">Descrição</span>
                          <input name="description" defaultValue={mission.description ?? ""} className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="label">Meta</span>
                            <input name="target" type="number" min={1} defaultValue={mission.target} className="input" />
                          </div>
                          <div>
                            <span className="label">XP</span>
                            <input name="xpReward" type="number" min={1} defaultValue={mission.xpReward} className="input" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="label">Fim</span>
                            <input name="endsAt" type="date" defaultValue={mission.endsAt} className="input" />
                          </div>
                          <div className="flex items-end">
                            <SubmitButton className="btn-primary w-full py-1.5 text-[0.72rem]">Salvar</SubmitButton>
                          </div>
                        </div>
                      </form>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "tipos" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <SectionCard title="Nova atividade" icon="plus" className="xl:col-span-4" subtitle="Defina a pontuação em XP.">
            <form action={saveActivityTypeAction} className="space-y-3">
              <div>
                <span className="label">Nome</span>
                <input name="name" className="input" required placeholder="Ex.: Fechar parceria" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Categoria</span>
                  <input name="category" className="input" defaultValue="Geral" required />
                </div>
                <div>
                  <span className="label">XP</span>
                  <input name="xp" type="number" min={1} max={5000} defaultValue={50} className="input" required />
                </div>
              </div>
              <div>
                <span className="label">Ícone</span>
                <select name="icon" className="input" defaultValue="zap">
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn-primary w-full" icon={<Icon name="plus" size={15} />}>Criar atividade</SubmitButton>
            </form>
          </SectionCard>

          <SectionCard title="Valores de XP por atividade" icon="zap" className="xl:col-span-8" subtitle="Alterações valem para novas aprovações e não recalculam o histórico.">
            <div className="space-y-2">
              {collections.types.map((type) => (
                <form key={type.id} action={saveActivityTypeAction} className="grid items-end gap-2 rounded-xl border border-white/7 bg-white/[0.02] p-2.5 sm:grid-cols-[1.5fr_1fr_0.6fr_0.7fr_auto]">
                  <input type="hidden" name="id" value={type.id} />
                  <div>
                    <span className="label">Atividade</span>
                    <input name="name" defaultValue={type.name} className="input" required />
                  </div>
                  <div>
                    <span className="label">Categoria</span>
                    <input name="category" defaultValue={type.category} className="input" required />
                  </div>
                  <div>
                    <span className="label">XP</span>
                    <input name="xp" type="number" min={1} max={5000} defaultValue={type.xp} className="input" required />
                  </div>
                  <div>
                    <span className="label">Status</span>
                    <select name="active" defaultValue={String(type.active)} className="input">
                      <option value="true">Ativa</option>
                      <option value="false">Inativa</option>
                    </select>
                  </div>
                  <div className="flex gap-1">
                    <input type="hidden" name="icon" value={type.icon} />
                    <SubmitButton className="btn-ghost px-2.5 py-1.5 text-[0.68rem]" pendingLabel="...">Salvar</SubmitButton>
                  </div>
                </form>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "patentes" ? (
        <SectionCard title="Gestão de patentes" icon="crown" subtitle="Defina o XP mínimo e a identidade de cada patente.">
          <div className="space-y-2">
            {collections.ranks.map((rank) => (
              <form key={rank.id} action={saveRankAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
                <input type="hidden" name="rankId" value={rank.id} />
                <RankEmblem tier={rank.tier} color={rank.color} size={40} />
                <div className="min-w-[120px] flex-1">
                  <span className="label">Patente</span>
                  <input name="name" defaultValue={rank.name} className="input" required />
                </div>
                <div className="w-28">
                  <span className="label">XP mínimo</span>
                  <input name="minXp" type="number" min={0} defaultValue={rank.minXp} className="input" required />
                </div>
                <div className="w-32">
                  <span className="label">Cor</span>
                  <input name="color" defaultValue={rank.color} className="input" />
                </div>
                <div className="hidden flex-1 sm:block">
                  <span className="label">Descrição</span>
                  <p className="py-2 text-[0.68rem] text-white/35">{rank.description}</p>
                </div>
                <SubmitButton className="btn-ghost px-3 py-1.5 text-[0.68rem]" pendingLabel="...">Salvar</SubmitButton>
              </form>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === "conquistas" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <SectionCard title="Criar conquista" icon="medal" className="xl:col-span-4" subtitle="Medalhas são liberadas automaticamente ao atingir a condição.">
            <form action={createAchievementAction} className="space-y-3">
              <div>
                <span className="label">Nome</span>
                <input name="name" className="input" required placeholder="Ex.: Mestre da entrega" />
              </div>
              <div>
                <span className="label">Descrição</span>
                <textarea name="description" rows={2} className="input resize-none" required placeholder="Condição de desbloqueio" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Métrica</span>
                  <select name="conditionType" className="input" defaultValue="activities">
                    {Object.entries(ACHIEVEMENT_CONDITION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="label">Meta</span>
                  <input name="target" type="number" min={1} defaultValue={1} className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">Bônus XP</span>
                  <input name="xpReward" type="number" min={0} defaultValue={50} className="input" />
                </div>
                <div>
                  <span className="label">Raridade</span>
                  <select name="rarity" className="input" defaultValue="comum">
                    <option value="comum">Comum</option>
                    <option value="rara">Rara</option>
                    <option value="epica">Épica</option>
                    <option value="lendaria">Lendária</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="label">Ícone</span>
                <select name="icon" className="input" defaultValue="trophy">
                  {ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <SubmitButton className="btn-primary w-full" icon={<Icon name="plus" size={15} />}>Criar conquista</SubmitButton>
            </form>
          </SectionCard>

          <SectionCard
            title="Catálogo de conquistas"
            icon="medal"
            className="xl:col-span-8"
            action={
              <form action={recalculateAchievementsAction}>
                <button type="submit" className="btn-ghost px-2.5 py-1.5 text-[0.65rem]">
                  <Icon name="history" size={11} /> Recalcular
                </button>
              </form>
            }
          >
            <div className="space-y-2">
              {collections.achievements.map((achievement) => (
                <div key={achievement.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/7 bg-white/[0.02] p-2.5">
                  <AchievementBadge icon={achievement.icon} rarity={achievement.rarity} unlocked={achievement.active} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{achievement.name}</p>
                    <p className="text-[0.62rem] text-white/40">
                      {achievement.description} • {ACHIEVEMENT_CONDITION_LABELS[achievement.conditionType]} ≥ {achievement.target} • +{achievement.xpReward} XP
                    </p>
                  </div>
                  <span className="chip border-white/10 bg-white/5 text-[0.6rem] uppercase text-white/45">{achievement.rarity}</span>
                  <form action={toggleAchievementAction}>
                    <input type="hidden" name="achievementId" value={achievement.id} />
                    <input type="hidden" name="active" value={String(!achievement.active)} />
                    <button type="submit" className="btn-ghost px-2 py-1 text-[0.62rem]">
                      {achievement.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "ajustes" ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <SectionCard title="Corrigir pontuação" icon="edit" className="xl:col-span-5" subtitle="Todo ajuste exige justificativa e fica registrado na auditoria.">
            <form action={adjustXpAction} className="space-y-3">
              <div>
                <span className="label">Integrante</span>
                <select name="memberId" className="input" required>
                  {team.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} — {formatNumber(member.totalXp)} XP
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="label">XP (use negativo para remover)</span>
                  <input name="amount" type="number" defaultValue={100} className="input" required />
                </div>
                <div>
                  <span className="label">Motivo</span>
                  <input name="reason" className="input" required placeholder="Ex.: bônus trimestral" />
                </div>
              </div>
              <div>
                <span className="label">Justificativa detalhada</span>
                <textarea name="justification" rows={3} className="input resize-none" required placeholder="Explique o contexto da correção" />
              </div>
              <SubmitButton className="btn-primary w-full" icon={<Icon name="zap" size={15} />}>Aplicar ajuste</SubmitButton>
            </form>
          </SectionCard>

          <SectionCard title="Ajustes recentes" icon="history" className="xl:col-span-7">
            <div className="space-y-2">
              {adjustments.length === 0 ? (
                <p className="text-xs text-white/35">Nenhum ajuste manual registrado.</p>
              ) : (
                adjustments.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/6 bg-white/[0.015] p-2.5">
                    <p className="text-[0.72rem] leading-relaxed text-white/70">{log.details}</p>
                    <p className="mt-0.5 text-[0.6rem] text-white/30">
                      {log.actorName ?? "Sistema"} • {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "auditoria" ? (
        <SectionCard title="Histórico de alterações" icon="history" subtitle="Trilha completa de auditoria da plataforma." action={<span className="chip border-white/10 bg-white/5 text-white/45">{logs.length} registros</span>}>
          <div className="relative space-y-2 pl-4">
            <span className="absolute bottom-2 left-1 top-2 w-px bg-white/8" />
            {logs.map((log) => (
              <div key={log.id} className="relative rounded-lg border border-white/6 bg-white/[0.015] p-2.5">
                <span className="absolute -left-[13px] top-3.5 size-2 rounded-full border border-neon/40 bg-ink-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip border-white/10 bg-white/5 text-[0.58rem] uppercase tracking-[0.08em] text-white/45">{log.action}</span>
                  <span className="text-[0.62rem] text-white/30">{log.entity}{log.entityId ? ` #${log.entityId}` : ""}</span>
                </div>
                <p className="mt-1 text-[0.72rem] leading-relaxed text-white/70">{log.details}</p>
                <p className="mt-0.5 text-[0.6rem] text-white/25">
                  {log.actorName ?? "Sistema"} • {formatDateTime(log.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
