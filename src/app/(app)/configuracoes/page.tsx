import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getAuditLogs, getMember } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/xp";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Avatar, Flash, PageHeader, Progress, SectionCard } from "@/components/ui";
import { RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const ACCENTS = ["#a259ff", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#c084fc", "#f97316"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const [stat, logs] = await Promise.all([getMember(session.id), getAuditLogs(30)]);
  const myLogs = logs.filter((log) => log.actorName === session.name).slice(0, 8);

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Conta e segurança"
        title="Configurações"
        description="Gerencie seu perfil, sua senha e acompanhe as alterações registradas na sua conta."
      />

      {session.mustChangePassword ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-200">
          <Icon name="alert" size={14} className="mt-0.5" />
          Sua conta foi criada com uma senha temporária. Defina uma nova senha para proteger o seu acesso.
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <SectionCard title="Perfil profissional" icon="user" subtitle="Estas informações aparecem no seu perfil e no ranking.">
            <form action={updateProfileAction} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <Avatar name={session.name} accent={session.accent} avatarUrl={session.avatarUrl} size={52} ring={stat?.rank.color} />
                <div>
                  <p className="text-sm font-semibold text-white">{session.name}</p>
                  <p className="text-[0.7rem] text-white/45">{session.jobTitle}</p>
                  <p className="text-[0.62rem] text-white/30">{session.email}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="label">Nome</span>
                  <input name="name" defaultValue={session.name} className="input" required minLength={2} maxLength={60} />
                </div>
                <div>
                  <span className="label">Cargo</span>
                  <input name="jobTitle" defaultValue={session.jobTitle} className="input" required minLength={2} maxLength={80} />
                </div>
              </div>
              <div>
                <span className="label">Bio</span>
                <textarea name="bio" defaultValue={session.bio ?? ""} rows={3} className="input resize-none" maxLength={280} placeholder="Conte um pouco sobre o seu papel na Aureon." />
              </div>
              <div>
                <span className="label">URL da foto de perfil (opcional)</span>
                <input name="avatarUrl" type="url" defaultValue={session.avatarUrl ?? ""} className="input" placeholder="https://.../sua-foto.jpg" />
              </div>
              <div>
                <span className="label">Cor de destaque</span>
                <div className="flex flex-wrap items-center gap-2">
                  {ACCENTS.map((accent) => (
                    <label key={accent} className="cursor-pointer">
                      <input type="radio" name="accent" value={accent} defaultChecked={session.accent === accent} className="peer sr-only" />
                      <span
                        className="flex size-7 items-center justify-center rounded-full border-2 border-transparent peer-checked:border-white"
                        style={{ background: accent }}
                      >
                        {session.accent === accent ? <Icon name="check" size={12} className="text-black/70" /> : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton icon={<Icon name="check" size={15} />}>Salvar alterações</SubmitButton>
            </form>
          </SectionCard>

          <SectionCard title="Segurança" icon="lock" subtitle="Senhas são armazenadas com hash scrypt e nunca são exibidas.">
            <form action={changePasswordAction} className="space-y-4">
              <div>
                <span className="label">Senha atual</span>
                <input type="password" name="currentPassword" className="input" required autoComplete="current-password" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="label">Nova senha</span>
                  <input type="password" name="newPassword" className="input" required minLength={6} autoComplete="new-password" />
                </div>
                <div>
                  <span className="label">Confirmar nova senha</span>
                  <input type="password" name="confirmPassword" className="input" required minLength={6} autoComplete="new-password" />
                </div>
              </div>
              <SubmitButton icon={<Icon name="lock" size={15} />}>Atualizar senha</SubmitButton>
            </form>
          </SectionCard>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard title="Sua conta" icon="shield">
            <div className="flex items-center gap-3">
              <RankEmblem tier={stat?.rank.tier ?? 1} color={stat?.rank.color} size={62} />
              <div>
                <p className="text-sm font-semibold text-white">{stat?.rank.name ?? "Recruta"}</p>
                <p className="text-[0.7rem] text-white/45">
                  Nível {stat?.level ?? 1} • {formatNumber(stat?.totalXp ?? 0)} XP
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={stat?.levelPct ?? 0} height={6} />
            </div>
            <dl className="mt-3 space-y-1.5 text-[0.7rem]">
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <dt className="text-white/40">E-mail</dt>
                <dd className="truncate pl-2 text-white/70">{session.email}</dd>
              </div>
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <dt className="text-white/40">Permissão</dt>
                <dd className="font-medium text-white/80">{session.role === "admin" ? "Administrador" : "Integrante"}</dd>
              </div>
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <dt className="text-white/40">Na Aureon desde</dt>
                <dd className="text-white/70">{formatDate(stat?.createdAt)}</dd>
              </div>
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <dt className="text-white/40">Atividades aprovadas</dt>
                <dd className="font-medium text-white/80">{stat?.approvedCount ?? 0}</dd>
              </div>
            </dl>
            <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.02] p-2.5 text-[0.65rem] leading-relaxed text-white/40">
              <p className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-white/55">
                <Icon name="lock" size={11} /> Permissões
              </p>
              {session.role === "admin"
                ? "Acesso total: aprovar atividades de terceiros, gerenciar integrantes, missões, conquistas e pontuações."
                : "Registrar atividades, resgatar missões e acompanhar o ranking. Aprovações são exclusivas da administração."}
              <p className="mt-1.5 text-white/30">Nunca é permitido aprovar as próprias atividades.</p>
            </div>
            {session.role === "admin" ? (
              <Link href="/admin" className="btn-primary mt-3 w-full py-1.5 text-[0.72rem]">
                <Icon name="shield" size={13} /> Abrir painel administrativo
              </Link>
            ) : null}
          </SectionCard>

          <SectionCard title="Histórico de alterações" icon="history" subtitle="Registro de auditoria das suas ações recentes.">
            {myLogs.length === 0 ? (
              <p className="text-xs text-white/35">Nenhuma alteração registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {myLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-white/6 bg-white/[0.015] px-2.5 py-2">
                    <p className="text-[0.7rem] text-white/70">{log.details}</p>
                    <p className="mt-0.5 text-[0.6rem] text-white/30">
                      {log.action} • {formatDate(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
