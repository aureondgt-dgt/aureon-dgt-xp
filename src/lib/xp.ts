export type RankLike = {
  id: number;
  name: string;
  slug: string;
  minXp: number;
  tier: number;
  color: string;
  description: string | null;
};

export type LevelInfo = {
  level: number;
  intoLevel: number;
  needed: number;
  pct: number;
  totalXp: number;
};

export function xpForLevel(level: number): number {
  // XP needed to move from `level` to `level + 1`
  return 200 + (level - 1) * 50;
}

export function getLevelInfo(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;
  while (level < 200) {
    const needed = xpForLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }
  const needed = xpForLevel(level);
  return {
    level,
    intoLevel: remaining,
    needed,
    pct: Math.min(100, Math.round((remaining / needed) * 100)),
    totalXp: safeXp,
  };
}

export function getRankInfo(totalXp: number, ranks: RankLike[]) {
  const sorted = [...ranks].sort((a, b) => a.minXp - b.minXp);
  const current = sorted.filter((rank) => totalXp >= rank.minXp).at(-1) ?? sorted[0];
  const next = sorted.find((rank) => rank.minXp > totalXp) ?? null;
  const base = current?.minXp ?? 0;
  const span = next ? Math.max(1, next.minXp - base) : 1;
  const pct = next ? Math.min(100, Math.round(((totalXp - base) / span) * 100)) : 100;
  return { current, next, pct, base };
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T12:00:00`) : value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora mesmo";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "mês" : "meses"} atrás`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
