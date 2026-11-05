import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { members, sessions } from "@/db/schema";
import { ensureDatabase } from "@/db/bootstrap";
import { verifyPassword } from "./password";

export const SESSION_COOKIE = "aureon_session";

export type SessionMember = {
  id: number;
  name: string;
  email: string;
  jobTitle: string;
  role: string;
  accent: string;
  avatarUrl: string | null;
  bio: string | null;
  mustChangePassword: boolean;
};

export async function authenticate(email: string, password: string): Promise<SessionMember | null> {
  await ensureDatabase();
  const normalized = email.trim().toLowerCase();
  const [member] = await db.select().from(members).where(eq(members.email, normalized)).limit(1);
  if (!member || member.status !== "active") return null;
  if (!verifyPassword(password, member.passwordHash)) return null;
  return toSessionMember(member);
}

function toSessionMember(member: typeof members.$inferSelect): SessionMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    jobTitle: member.jobTitle,
    role: member.role,
    accent: member.accent,
    avatarUrl: member.avatarUrl,
    bio: member.bio,
    mustChangePassword: member.mustChangePassword,
  };
}

export async function createSession(memberId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessions).values({ token, memberId, expiresAt });
  const store = await cookies();
  const headerStore = await headers();
  const isHttps =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https" || headerStore.get("origin")?.startsWith("https") === true;
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentMember(): Promise<SessionMember | null> {
  await ensureDatabase();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ member: members })
    .from(sessions)
    .innerJoin(members, eq(sessions.memberId, members.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const found = rows[0]?.member;
  if (!found || found.status !== "active") return null;
  return toSessionMember(found);
}

export async function requireMember(): Promise<SessionMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

export async function requireAdmin(): Promise<SessionMember> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/inicio");
  return member;
}
