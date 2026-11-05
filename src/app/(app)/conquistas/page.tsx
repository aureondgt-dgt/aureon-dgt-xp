import { requireMember } from "@/lib/auth";
import { getAchievementsView, getMember } from "@/lib/queries";
import { formatDate, formatNumber } from "@/lib/xp";
import { ACHIEVEMENT_CONDITION_LABELS } from "@/lib/metrics";
import { AchievementBadge } from "@/components/emblems";
import { EmptyState, Flash, PageHeader, Progress, StatCard } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const RARITY_LABEL: Record<string, string> = {
  comum: "Comum",
  rara: "Rara",
  epica: "Épica",
  lendaria: "Lendária",
};

export default async function AchievementsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const [list, stat] = await Promise.all([getAchievementsView(session.id), getMember(session.id)]);
  const unlocked = list.filter((achievement) => achievement.unlockedAt);
  const locked = list.filter((achievement) => !achievement.unlockedAt);
  const xpFromAchievements = unlocked.reduce((sum, achievement) => sum + achievement.xpReward, 0);
  const progress = Math.round((unlocked.length / Math.max(1, list.length)) * 100);

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Sistema de conquistas"
        title="Sua coleção de medalhas"
        description="Cada conquista registra um marco real da sua trajetória dentro da Aureon."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Conquistas" value={`${unlocked.length}/${list.length}`} hint={`${progress}% da coleção`} icon="medal" index={0} />
        <StatCard label="XP de conquistas" value={formatNumber(xpFromAchievements)} hint="Bônus já creditados" icon="zap" color="#34d399" index={1} />
        <StatCard label="Bloqueadas" value={locked.length} hint="Próximos objetivos" icon="lock" color="#94a3b8" index={2} />
        <StatCard label="Patente" value={stat?.rank.name ?? "Recruta"} hint={`Nível ${stat?.level ?? 1}`} icon="crown" color="#fbbf24" index={3} />
      </div>

      <div className="card p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold text-white">
            <Icon name="sparkles" size={15} className="text-neon-bright" /> Progresso da coleção
          </span>
          <span className="text-xs text-white/45">{progress}%</span>
        </div>
        <Progress value={progress} height={9} />
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="medal" size={16} className="text-amber-300" />
          <h2 className="text-sm font-semibold tracking-tight text-white">Desbloqueadas</h2>
          <span className="chip border-white/10 bg-white/5 text-white/45">{unlocked.length}</span>
        </div>
        {unlocked.length === 0 ? (
          <EmptyState icon="medal" title="Nenhuma conquista ainda" description="Registre atividades, feche vendas e entregue sites para desbloquear sua primeira medalha." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unlocked.map((achievement) => (
              <article key={achievement.id} className="card relative overflow-hidden p-4">
                <div className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-amber-400/10 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <AchievementBadge icon={achievement.icon} rarity={achievement.rarity} size={64} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-white">{achievement.name}</h3>
                      <span className="chip border-amber-400/25 bg-amber-400/10 text-[0.58rem] uppercase tracking-[0.1em] text-amber-300">
                        {RARITY_LABEL[achievement.rarity] ?? achievement.rarity}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-white/50">{achievement.description}</p>
                    <div className="mt-2 flex items-center justify-between text-[0.62rem]">
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <Icon name="check" size={11} /> Desbloqueada em {formatDate(achievement.unlockedAt)}
                      </span>
                      <span className="text-white/35">+{achievement.xpReward} XP</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Icon name="lock" size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold tracking-tight text-white">Em progresso</h2>
          <span className="chip border-white/10 bg-white/5 text-white/45">{locked.length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {locked.map((achievement) => (
            <article key={achievement.id} className="rounded-xl border border-white/7 bg-white/[0.015] p-4">
              <div className="flex items-start gap-3">
                <AchievementBadge icon={achievement.icon} rarity={achievement.rarity} unlocked={false} size={58} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-white/80">{achievement.name}</h3>
                  <p className="mt-1 text-[0.7rem] leading-relaxed text-white/40">{achievement.description}</p>
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[0.62rem] text-white/35">
                      <span>{ACHIEVEMENT_CONDITION_LABELS[achievement.conditionType] ?? achievement.conditionType}</span>
                      <span>
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <Progress value={(achievement.progress / Math.max(1, achievement.target)) * 100} height={4} color="#6d28d9" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
