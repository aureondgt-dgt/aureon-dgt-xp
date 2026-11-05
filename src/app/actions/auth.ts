"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { authenticate, createSession, destroySession, requireMember } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/gamification";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=Preencha%20e-mail%20e%20senha.");

  const member = await authenticate(email, password);
  if (!member) redirect("/login?error=E-mail%20ou%20senha%20inv%C3%A1lidos.");
  await createSession(member.id);
  await logAudit(member.id, "auth.login", "session", null, `${member.name} entrou na plataforma.`);
  redirect("/inicio");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const current = await requireMember();
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const accent = String(formData.get("accent") ?? current.accent);
  const avatarRaw = String(formData.get("avatarUrl") ?? "").trim();
  if (name.length < 2 || jobTitle.length < 2) {
    redirect("/configuracoes?msg=Nome%20e%20cargo%20s%C3%A3o%20obrigat%C3%B3rios.");
  }
  if (avatarRaw && !/^https?:\/\//i.test(avatarRaw)) {
    redirect("/configuracoes?msg=A%20URL%20do%20avatar%20deve%20come%C3%A7ar%20com%20http%20ou%20https.");
  }
  await db
    .update(members)
    .set({ name, jobTitle, bio: bio || null, accent, avatarUrl: avatarRaw || null })
    .where(eq(members.id, current.id));
  await logAudit(current.id, "profile.updated", "member", current.id, `${current.name} atualizou o próprio perfil.`);
  revalidatePath("/", "layout");
  redirect("/configuracoes?msg=Perfil%20atualizado%20com%20sucesso.");
}

export async function changePasswordAction(formData: FormData) {
  const current = await requireMember();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const [record] = await db.select().from(members).where(eq(members.id, current.id)).limit(1);
  if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
    redirect("/configuracoes?msg=Senha%20atual%20incorreta.");
  }
  if (newPassword.length < 6) {
    redirect("/configuracoes?msg=A%20nova%20senha%20precisa%20ter%20ao%20menos%206%20caracteres.");
  }
  if (newPassword !== confirm) {
    redirect("/configuracoes?msg=As%20senhas%20n%C3%A3o%20coincidem.");
  }
  await db
    .update(members)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false })
    .where(eq(members.id, current.id));
  await logAudit(current.id, "password.changed", "member", current.id, "Senha atualizada pelo próprio integrante.");
  redirect("/configuracoes?msg=Senha%20alterada%20com%20sucesso.");
}
