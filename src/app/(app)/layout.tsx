import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentMember } from "@/lib/auth";
import { getMember, getNotifications, getPendingApprovalsCount } from "@/lib/queries";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentMember();
  if (!session) redirect("/login");

  const [stat, notifications, pendingApprovals] = await Promise.all([
    getMember(session.id),
    getNotifications(session.id),
    session.role === "admin" ? getPendingApprovalsCount() : Promise.resolve(0),
  ]);

  return (
    <AppShell
      member={{
        id: session.id,
        name: session.name,
        jobTitle: session.jobTitle,
        role: session.role,
        accent: session.accent,
        avatarUrl: session.avatarUrl,
        level: stat?.level ?? 1,
        rankName: stat?.rank.name ?? "Recruta",
        rankTier: stat?.rank.tier ?? 1,
        rankColor: stat?.rank.color ?? "#9ca3af",
      }}
      notifications={notifications.items}
      unread={notifications.unread}
      pendingApprovals={pendingApprovals}
    >
      {children}
    </AppShell>
  );
}
