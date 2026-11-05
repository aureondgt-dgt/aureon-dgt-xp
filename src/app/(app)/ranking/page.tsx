import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { getRanking } from "@/lib/queries";
import { formatNumber } from "@/lib/xp";
import { Avatar, Flash, PageHeader, SectionCard } from "@/components/ui";
import { RankEmblem } from "@/components/emblems";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const session = await requireMember();
  const { msg } = await searchParams;
  const { ranked, ranks } = await getRanking();
  const me = ranked.find((entry) => entry.id === session.id);
  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const totalTeamXp = ranked.reduce((sum, entry) => sum + entry.totalXp, 0);

  return (
    <div className="space-y-5">
      <Flash message={msg} />
      <PageHeader
        eyebrow="Ranking Aureon"
        title="Ranking da equipe"
        description="A disputa saudável que transforma performance em evolução coletiva. Atualizado a cada atividade aprovada."
        action={
          <span className="chip border-neon/25 bg-neon/10 text-neon-bright">
            <Icon name="trophy" size={12} /> {formatNumber(totalTeamXp)} XP acumulados pela equipe
          </span>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {podium.map((entry) => {
          const medalColor = entry.position === 1 ? "#fbbf24" : entry.position === 2 ? "#cbd5e1" : "#fb923c";
          const isFirst = entry.position === 1;
          return (
            <div
              key={entry.id}
              className={`card relative overflow-hidden p-4 text-center ${isFirst ? "card-glow md:-mt-2 md:pb-6" : ""}`}
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-24 h-40 blur-3xl"
                style={{ background: `radial-gradient(circle, ${medalColor}33, transparent 70%)` }}
              />
              <div className="relative mx-auto mb-2 flex items-center justify-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full border" style={{ borderColor: `${medalColor}55`, color: medalColor, background: `${medalColor}14` }}>
                  <Icon name={isFirst ? "crown" : "medal"} size={14} />
                </span>
                <span className="text-sm font-bold" style={{ color: medalColor }}>
                  {entry.position}º lugar
                </span>
              </div>
              <div className="relative flex justify-center">
                <Avatar name={entry.name} accent={entry.accent} avatarUrl={entry.avatarUrl} size={isFirst ? 76 : 62} ring={medalColor} />
              </div>
              <h3 className="relative mt-2 text-base font-semibold text-white">{entry.name}</h3>
              <p className="relative text-[0.7rem] text-white/45">{entry.jobTitle}</p>
              <div className="relative mt-2 flex items-center justify-center gap-2">
                <RankEmblem tier={entry.rank.tier} color={entry.rank.color} size={26} />
                <span className="text-[0.7rem] font-medium text-white/70">{entry.rank.name}</span>
              </div>
              <p className="relative mt-2 text-xl font-semibold text-white">{formatNumber(entry.totalXp)} XP</p>
              <p className="relative text-[0.65rem] text-white/35">
                Nível {entry.level} • {entry.approvedCount} atividades • +{formatNumber(entry.weekXp)} XP na semana
              </p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <SectionCard title="Classificação geral" icon="chart" className="xl:col-span-8" subtitle="Todos os integrantes ativos da Aureon ordenados por XP.">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="text-[0.62rem] uppercase tracking-[0.14em] text-white/35">
                  <th className="px-2 py-2 font-medium">#</th>
                  <th className="px-2 py-2 font-medium">Integrante</th>
                  <th className="px-2 py-2 font-medium">Cargo</th>
                  <th className="hidden px-2 py-2 font-medium sm:table-cell">Nível</th>
                  <th className="px-2 py-2 text-right font-medium">XP</th>
                  <th className="px-2 py-2 text-right font-medium">Patente</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry) => {
                  const isMe = entry.id === session.id;
                  return (
                    <tr key={entry.id} className={`border-t border-white/6 transition hover:bg-white/[0.03] ${isMe ? "bg-neon/[0.07]" : ""}`}>
                      <td className="px-2 py-2.5">
                        <span
                          className={`flex size-6 items-center justify-center rounded-md text-[0.7rem] font-bold ${
                            entry.position === 1
                              ? "bg-amber-400/15 text-amber-300"
                              : entry.position === 2
                                ? "bg-slate-300/10 text-slate-200"
                                : entry.position === 3
                                  ? "bg-orange-400/15 text-orange-300"
                                  : "bg-white/5 text-white/45"
                          }`}
                        >
                          {entry.position}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <Link href={`/equipe/${entry.id}`} className="flex items-center gap-2">
                          <Avatar name={entry.name} accent={entry.accent} avatarUrl={entry.avatarUrl} size={30} ring={isMe ? entry.rank.color : null} />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white">
                              {entry.name}
                              {isMe ? <span className="ml-1 text-[0.58rem] font-normal text-neon-bright">você</span> : null}
                            </p>
                            <p className="text-[0.6rem] text-white/35">{entry.approvedCount} atividades</p>
                          </div>
                        </Link>
                      </td>
                      <td className="hidden px-2 py-2.5 text-[0.7rem] text-white/50 sm:table-cell">{entry.jobTitle}</td>
                      <td className="hidden px-2 py-2.5 text-xs text-white/70 sm:table-cell">{entry.level}</td>
                      <td className="px-2 py-2.5 text-right text-xs font-semibold text-white">{formatNumber(entry.totalXp)}</td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1.5 text-[0.68rem]" style={{ color: entry.rank.color }}>
                          <RankEmblem tier={entry.rank.tier} color={entry.rank.color} size={18} />
                          {entry.rank.name}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <div className="space-y-4 xl:col-span-4">
          <SectionCard title="Sua posição" icon="crown">
            <div className="flex items-center gap-3">
              <Avatar name={session.name} accent={session.accent} avatarUrl={session.avatarUrl} size={52} ring={me?.rank.color} />
              <div>
                <p className="text-2xl font-semibold text-white">#{me?.position ?? "—"}</p>
                <p className="text-[0.68rem] text-white/45">
                  {me?.rank.name} • {formatNumber(me?.totalXp ?? 0)} XP
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[0.68rem]">
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <span className="text-white/40">Integrantes na sua frente</span>
                <span className="font-semibold text-white">{Math.max(0, (me?.position ?? 1) - 1)}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <span className="text-white/40">XP para o próximo nível</span>
                <span className="font-semibold text-white">{formatNumber(me?.needed ?? 0)}</span>
              </div>
              <div className="flex justify-between rounded-lg border border-white/7 bg-white/[0.02] px-2.5 py-1.5">
                <span className="text-white/40">Próxima patente</span>
                <span className="font-semibold text-neon-bright">{me?.nextRank?.name ?? "Máxima"}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Escada de patentes" icon="medal" subtitle="Cada patente exige um novo patamar de XP.">
            <ol className="space-y-1.5">
              {ranks.map((rank) => {
                const current = me?.rank.id === rank.id;
                const achieved = (me?.totalXp ?? 0) >= rank.minXp;
                return (
                  <li
                    key={rank.id}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                      current ? "border-neon/40 bg-neon/10" : "border-white/6 bg-white/[0.015]"
                    }`}
                  >
                    <RankEmblem tier={rank.tier} color={rank.color} size={26} muted={!achieved && !current} />
                    <span className={`flex-1 text-[0.72rem] ${current ? "font-semibold text-white" : achieved ? "text-white/70" : "text-white/35"}`}>
                      {rank.name}
                    </span>
                    <span className="text-[0.62rem] text-white/30">{formatNumber(rank.minXp)} XP</span>
                  </li>
                );
              })}
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
