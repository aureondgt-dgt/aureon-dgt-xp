import { requireMember } from "@/lib/auth";
import { getStatsData } from "@/lib/queries";
import { formatNumber } from "@/lib/xp";
import { Flash, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { HorizontalBars, MultiMemberChart, WeeklyBarChart } from "@/components/charts";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

function weekStart(dateString: string): string {
  const date = new Date(`${dateString.slice(0, 10)}T12:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireMember();
  const { msg } = await searchParams;
  const { team, rawActivities, xpSeries } = await getStatsData();

  const countBySlug = (slug: string) => rawActivities.filter((activity) => activity.slug === slug).length;
  const totalActivities = rawActivities.length;
  const sales = countBySlug("fechar-venda");
  const clients = countBySlug("conseguir-interessado");
  const sitesCreated = countBySlug("criar-site");
  const sitesDelivered = countBySlug("entregar-site");
  const meetings = countBySlug("agendar-reuniao");
  const totalXp = team.reduce((sum, member) => sum + member.totalXp, 0);
  const pending = team.reduce((sum, member) => sum + member.pendingCount, 0);

  const weeks: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
  for (let index = 7; index >= 0; index -= 1) {
    const date = new Date(cursor);
    date.setDate(date.getDate() - index * 7);
    weeks.push(date.toISOString().slice(0, 10));
  }
  const weeklyData = weeks.map((week) => {
    const count = rawActivities.filter((activity) => weekStart(activity.occurredAt) === week).length;
    const [, month, day] = week.split("-");
    return { label: `${day}/${month}`, value: count };
  });

  const categoryMap = new Map<string, number>();
  for (const activity of rawActivities) {
    categoryMap.set(activity.category, (categoryMap.get(activity.category) ?? 0) + 1);
  }
  const categories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], index) => ({
      label,
      value,
      color: ["#a259ff", "#c084fc", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#94a3b8"][index % 7],
    }));

  const memberSeries = team.map((member) => ({
    name: member.name,
    color: member.accent,
    data: xpSeries.map((point) => Number(point[String(member.id)] ?? 0)),
  }));
  const labels = xpSeries.map((point) => String(point.date));

  const productivity = [...team]
    .map((member) => {
      const mine = rawActivities.filter((activity) => activity.memberId === member.id);
      return {
        id: member.id,
        name: member.name,
        color: member.accent,
        activities: mine.length,
        xp: mine.reduce((sum, activity) => sum + activity.xpAwarded, 0),
      };
    })
    .sort((a, b) => b.xp - a.xp);
  const maxProductivity = Math.max(1, ...productivity.map((entry) => entry.xp));

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Inteligência de performance"
        title="Estatísticas da Aureon"
        description="Indicadores reais consolidados a partir das atividades aprovadas e do histórico de XP da equipe."
        action={
          <span className="chip border-white/10 bg-white/5 text-white/50">
            <Icon name="history" size={12} /> Janela de 120 dias
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Vendas realizadas" value={sales} hint="Contratos fechados" icon="rocket" color="#34d399" index={0} />
        <StatCard label="Clientes conquistados" value={clients} hint="Interessados confirmados" icon="handshake" color="#38bdf8" index={1} />
        <StatCard label="Sites criados" value={sitesCreated} hint="Projetos em construção" icon="code" color="#c084fc" index={2} />
        <StatCard label="Sites entregues" value={sitesDelivered} hint="Publicados em produção" icon="check" color="#fbbf24" index={3} />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Atividades aprovadas" value={totalActivities} hint="Últimos 120 dias" icon="briefcase" index={0} />
        <StatCard label="XP coletivo" value={formatNumber(totalXp)} hint="Histórico completo" icon="zap" color="#c084fc" index={1} />
        <StatCard label="Reuniões agendadas" value={meetings} hint="Pipeline comercial" icon="calendar" color="#38bdf8" index={2} />
        <StatCard label="Aguardando aprovação" value={pending} hint="Fila de validação" icon="clock" color="#fbbf24" index={3} />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard title="Evolução de XP por integrante" icon="trend" className="xl:col-span-8" subtitle="Curva acumulada de experiência em 84 dias.">
          <MultiMemberChart series={memberSeries} labels={labels} />
        </SectionCard>

        <SectionCard title="Atividades por semana" icon="chart" className="xl:col-span-4" subtitle="Produtividade coletiva nas últimas 8 semanas.">
          <WeeklyBarChart data={weeklyData} />
          <p className="mt-3 text-center text-[0.65rem] text-white/35">
            Média de {Math.round(totalActivities / 8)} atividades por semana
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard title="Produtividade individual" icon="users" className="xl:col-span-5" subtitle="XP acumulado por integrante no período.">
          <div className="space-y-3">
            {productivity.map((entry) => (
              <div key={entry.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-white/70">
                    <span className="size-2 rounded-full" style={{ background: entry.color }} /> {entry.name}
                  </span>
                  <span className="text-white">
                    <span className="font-semibold">{formatNumber(entry.xp)}</span>
                    <span className="text-white/35"> XP • {entry.activities} ativ.</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(entry.xp / maxProductivity) * 100}%`, background: `linear-gradient(90deg, ${entry.color}66, ${entry.color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/7 bg-white/[0.02] p-2.5">
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-white/35">Produtividade coletiva</p>
              <p className="mt-0.5 text-lg font-semibold text-white">{totalActivities} atividades</p>
            </div>
            <div className="rounded-lg border border-white/7 bg-white/[0.02] p-2.5">
              <p className="text-[0.6rem] uppercase tracking-[0.1em] text-white/35">Entrega por atividade</p>
              <p className="mt-0.5 text-lg font-semibold text-white">
                {totalActivities ? Math.round(rawActivities.reduce((sum, activity) => sum + activity.xpAwarded, 0) / totalActivities) : 0} XP
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Atividades por categoria" icon="filter" className="xl:col-span-4" subtitle="Distribuição de esforço da equipe.">
          <HorizontalBars data={categories.slice(0, 7)} />
        </SectionCard>

        <SectionCard title="Eficiência por integrante" icon="growth" className="xl:col-span-3" subtitle="Relação entre XP e entregas.">
          <div className="space-y-2">
            {productivity.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-white/7 bg-white/[0.02] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">{entry.name}</span>
                  <span className="text-[0.68rem] font-semibold text-emerald-300">
                    {entry.activities ? Math.round(entry.xp / entry.activities) : 0} XP/ativ.
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.6rem] text-white/35">
                  <span>{entry.activities} atividades</span>
                  <span>{formatNumber(entry.xp)} XP</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
