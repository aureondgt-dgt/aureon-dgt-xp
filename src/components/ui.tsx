import Link from "next/link";
import { initials } from "@/lib/xp";
import { Icon, type IconName } from "./icons";

export function Avatar({
  name,
  accent = "#a259ff",
  avatarUrl,
  size = 44,
  ring,
  className = "",
}: {
  name: string;
  accent?: string;
  avatarUrl?: string | null;
  size?: number;
  ring?: string | null;
  className?: string;
}) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.36),
        background: `radial-gradient(circle at 30% 20%, ${accent}44, #0b0b13 72%)`,
        border: `1px solid ${ring ?? "rgba(255,255,255,0.12)"}`,
        boxShadow: ring ? `0 0 18px -6px ${ring}` : undefined,
      }}
      title={name}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span style={{ color: accent }}>{initials(name)}</span>
      )}
    </div>
  );
}

export function Progress({
  value,
  color = "#a259ff",
  height = 8,
  className = "",
}: {
  value: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-white/7 ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 14px -2px ${color}aa`,
        }}
      />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  rejected: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  closed: "border-white/15 bg-white/5 text-white/60",
  draft: "border-white/15 bg-white/5 text-white/60",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`chip border ${STATUS_STYLES[status] ?? STATUS_STYLES.closed}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
  subtitle,
}: {
  title: string;
  icon?: IconName;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}) {
  return (
    <section className={`card p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neon-bright">
              <Icon name={icon} size={16} />
            </span>
          ) : null}
          <div>
            <h2 className="text-[0.95rem] font-semibold tracking-tight text-white">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-white/45">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  color = "#a259ff",
  index = 0,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconName;
  color?: string;
  index?: number;
}) {
  return (
    <div
      className="card animate-fade-up relative overflow-hidden p-4"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full blur-2xl"
        style={{ background: `${color}33` }}
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/45">{label}</span>
        <Icon name={icon} size={18} style={{ color }} />
      </div>
      <p className="relative mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{value}</p>
      {hint ? <p className="relative mt-1 text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neon-bright">
        <Icon name={icon} />
      </span>
      <p className="text-sm font-semibold text-white">{title}</p>
      {description ? <p className="max-w-sm text-xs text-white/50">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Flash({ message }: { message?: string }) {
  if (!message) return null;
  const isError = /não|erro|inválid|insuficiente|incorret/i.test(message);
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
        isError
          ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
          : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      }`}
    >
      <Icon name={isError ? "alert" : "check"} size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function SeeAllLink({ href, label = "Ver todos" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-neon-bright transition hover:text-white"
    >
      {label}
      <Icon name="arrow-right" size={13} />
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-neon-bright/80">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-white/50">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
