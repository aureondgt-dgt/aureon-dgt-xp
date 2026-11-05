"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { markNotificationsReadAction } from "@/app/actions/missions";
import { Avatar } from "./ui";
import { BrandMark, Icon, type IconName } from "./icons";
import { RankEmblem } from "./emblems";
import { timeAgo } from "@/lib/xp";

export type ShellMember = {
  id: number;
  name: string;
  jobTitle: string;
  role: string;
  accent: string;
  avatarUrl: string | null;
  level: number;
  rankName: string;
  rankTier: number;
  rankColor: string;
};

export type ShellNotification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/inicio", label: "Início", icon: "home" },
  { href: "/missoes", label: "Missões", icon: "target" },
  { href: "/atividades", label: "Atividades", icon: "briefcase" },
  { href: "/conquistas", label: "Conquistas", icon: "medal" },
  { href: "/ranking", label: "Ranking", icon: "trophy" },
  { href: "/equipe", label: "Equipe", icon: "users" },
  { href: "/estatisticas", label: "Estatísticas", icon: "trend" },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
];

const NOTIFICATION_ICONS: Record<string, IconName> = {
  activity: "check",
  xp: "zap",
  achievement: "medal",
  rank: "crown",
  mission: "target",
  approval: "shield",
  welcome: "sparkles",
  account: "user",
  security: "lock",
};

function NavLinks({ member, pendingApprovals, onNavigate }: { member: ShellMember; pendingApprovals: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              active
                ? "bg-gradient-to-r from-neon/22 via-neon/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(162,89,255,0.28)]"
                : "text-white/55 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            {active ? <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-neon" /> : null}
            <Icon name={item.icon} size={18} className={active ? "text-neon-bright" : "text-white/45 group-hover:text-white/80"} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
      {member.role === "admin" ? (
        <Link
          href="/admin"
          onClick={onNavigate}
          className={`group relative mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
            pathname.startsWith("/admin")
              ? "bg-gradient-to-r from-neon/22 via-neon/10 to-transparent text-white shadow-[inset_0_0_0_1px_rgba(162,89,255,0.28)]"
              : "text-white/55 hover:bg-white/[0.04] hover:text-white"
          }`}
        >
          <Icon name="shield" size={18} className="text-neon-bright/80" />
          <span className="font-medium">Administração</span>
          {pendingApprovals > 0 ? (
            <span className="ml-auto rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300">
              {pendingApprovals}
            </span>
          ) : null}
        </Link>
      ) : null}
    </nav>
  );
}

function SidebarContent({ member, pendingApprovals, onNavigate }: { member: ShellMember; pendingApprovals: number; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/inicio" onClick={onNavigate} className="flex items-center gap-3 px-2 py-1">
        <BrandMark className="h-10 w-10" />
        <div>
          <p className="text-[1.05rem] font-bold tracking-[0.16em] text-white">
            AUREON<span className="text-neon-bright">XP</span>
          </p>
          <p className="text-[0.58rem] font-medium uppercase tracking-[0.3em] text-white/35">Evolua. Conquiste.</p>
        </div>
      </Link>

      <div className="my-5 px-1">
        <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
          <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={38} ring={member.rankColor} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{member.name}</p>
            <p className="truncate text-[0.68rem] text-white/45">
              Nível {member.level} • {member.rankName}
            </p>
          </div>
          <RankEmblem tier={member.rankTier} color={member.rankColor} size={28} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <NavLinks member={member} pendingApprovals={pendingApprovals} onNavigate={onNavigate} />
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-gradient-to-br from-neon/14 via-transparent to-transparent p-3">
        <p className="text-xs font-semibold text-white">Aureon.</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neon-bright/90">Juntos, vamos mais longe.</p>
        <div className="mt-3 border-t border-white/8 pt-3">
          <p className="text-[0.6rem] font-semibold tracking-[0.28em] text-white/70">AUREON</p>
          <p className="text-[0.55rem] tracking-[0.32em] text-white/30">G R O U P</p>
        </div>
      </div>
    </div>
  );
}

function NotificationMenu({ notifications, unread }: { notifications: ShellNotification[]; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-neon/40 hover:text-white"
        aria-label="Notificações"
      >
        <Icon name="bell" size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-neon text-[0.58rem] font-bold text-white shadow-[0_0_10px_#a259ff]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Fechar" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <p className="text-sm font-semibold text-white">Notificações</p>
              <form action={markNotificationsReadAction}>
                <button type="submit" className="text-[0.68rem] font-medium text-neon-bright hover:text-white">
                  Marcar como lidas
                </button>
              </form>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-white/40">Nenhuma notificação por aqui.</p>
              ) : (
                notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.link ?? "/inicio"}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/[0.04] ${
                      item.read ? "opacity-65" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-neon/25 bg-neon/10 text-neon-bright">
                      <Icon name={NOTIFICATION_ICONS[item.type] ?? "bell"} size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{item.title}</p>
                      {item.body ? <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-relaxed text-white/45">{item.body}</p> : null}
                      <p className="mt-1 text-[0.6rem] text-white/30">{timeAgo(item.createdAt)}</p>
                    </div>
                    {!item.read ? <span className="ml-auto mt-1 size-1.5 shrink-0 rounded-full bg-neon" /> : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function UserMenu({ member }: { member: ShellMember }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition hover:border-neon/40"
      >
        <Avatar name={member.name} accent={member.accent} avatarUrl={member.avatarUrl} size={28} />
        <span className="hidden text-sm font-medium text-white sm:block">{member.name}</span>
        <Icon name="chevron-down" size={14} className="text-white/40" />
      </button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-label="Fechar" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl shadow-black/60">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-white">{member.name}</p>
              <p className="text-[0.68rem] text-white/45">{member.jobTitle}</p>
            </div>
            <Link href="/configuracoes" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white">
              <Icon name="settings" size={14} /> Configurações
            </Link>
            <Link href="/equipe" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white">
              <Icon name="user" size={14} /> Meu perfil
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10">
                <Icon name="logout" size={14} /> Sair da conta
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}

const PAGE_TITLES: Record<string, string> = {
  inicio: "Dashboard",
  missoes: "Missões",
  atividades: "Atividades",
  conquistas: "Conquistas",
  ranking: "Ranking",
  equipe: "Equipe",
  estatisticas: "Estatísticas",
  configuracoes: "Configurações",
  admin: "Administração",
};

export function AppShell({
  member,
  notifications,
  unread,
  pendingApprovals,
  children,
}: {
  member: ShellMember;
  notifications: ShellNotification[];
  unread: number;
  pendingApprovals: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const segment = pathname.split("/")[1] || "inicio";
  const title = PAGE_TITLES[segment] ?? "Aureon XP";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-white/8 bg-ink-950/80 p-4 backdrop-blur-xl lg:block">
        <SidebarContent member={member} pendingApprovals={pendingApprovals} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[280px] border-r border-white/10 bg-ink-950 p-4 shadow-2xl">
            <SidebarContent member={member} pendingApprovals={pendingApprovals} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/8 bg-ink-950/75 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-white/70 lg:hidden"
              aria-label="Abrir menu"
            >
              <Icon name="menu" size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden font-semibold text-white sm:inline">Aureon XP</span>
              <Icon name="chevron-right" size={13} className="hidden text-white/25 sm:block" />
              <span className="text-white/55">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationMenu notifications={notifications} unread={unread} />
            <UserMenu member={member} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
        <footer className="border-t border-white/6 px-4 py-4 text-center text-[0.65rem] tracking-[0.2em] text-white/25 sm:px-6">
          AUREON XP · EVOLUA. CONQUISTE. CONSTRUA A AUREON.
        </footer>
      </div>
    </div>
  );
}
