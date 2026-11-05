export const METRIC_LABELS: Record<string, string> = {
  activities: "Atividades aprovadas",
  sales: "Vendas fechadas",
  clients: "Interessados conquistados",
  meetings: "Reuniões agendadas",
  sites_created: "Sites criados",
  sites_delivered: "Sites entregues",
  content: "Conteúdos publicados",
  strategies: "Estratégias criadas",
  xp: "XP acumulado no período",
};

export const ACTIVITY_SLUGS_BY_METRIC: Record<string, string[]> = {
  sales: ["fechar-venda"],
  clients: ["conseguir-interessado"],
  meetings: ["agendar-reuniao"],
  sites_created: ["criar-site"],
  sites_delivered: ["entregar-site"],
  content: ["criar-conteudo"],
  strategies: ["criar-estrategia"],
  activities: [],
  xp: [],
};

export const MISSION_TYPE_LABELS: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  special: "Especial",
  collective: "Coletiva",
};

export const ACHIEVEMENT_CONDITION_LABELS: Record<string, string> = {
  sales: "Vendas fechadas",
  clients: "Interessados",
  sites_delivered: "Sites entregues",
  sites_created: "Sites criados",
  activities: "Atividades aprovadas",
  active_days: "Dias ativos",
  content: "Conteúdos",
  strategies: "Estratégias",
  xp: "XP total",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  active: "Ativa",
  closed: "Encerrada",
  draft: "Rascunho",
};

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function startOfWeekDate(reference = new Date()): Date {
  const date = new Date(reference);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function buildDailySeries(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}
