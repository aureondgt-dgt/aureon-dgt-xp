"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  achievements,
  activityTypes,
  members,
  missions,
  ranks,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { generatePassword, hashPassword } from "@/lib/password";
import { applyXp, logAudit, notify, notifyEveryone } from "@/lib/gamification";
import { addDaysISO, todayISO } from "@/lib/xp";

function go(tab: string, message: string): never {
  redirect(`/admin?tab=${tab}&msg=${encodeURIComponent(message)}`);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const jobTitle = String(formData.get("jobTitle") ?? "Integrante").trim();
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";
  const accent = String(formData.get("accent") ?? "#a259ff");
  const password = String(formData.get("password") ?? "").trim() || generatePassword();

  if (name.length < 2) go("integrantes", "Informe o nome do integrante.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) go("integrantes", "Informe um e-mail válido.");
  if (password.length < 6) go("integrantes", "A senha precisa ter ao menos 6 caracteres.");

  const existing = await db.select({ id: members.id }).from(members).where(eq(members.email, email)).limit(1);
  if (existing.length) go("integrantes", "Já existe um integrante com este e-mail.");

  const [created] = await db
    .insert(members)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      jobTitle,
      role,
      accent,
      mustChangePassword: true,
    })
    .returning({ id: members.id });

  await notify(
    created.id,
    "welcome",
    "Bem-vindo à Aureon XP",
    `Sua conta foi criada por ${admin.name}. Senha temporária: ${password}. Altere em Configurações.`,
    "/configuracoes",
  );
  await logAudit(admin.id, "member.created", "member", created.id, `${admin.name} criou a conta de ${name} (${email}).`);
  revalidatePath("/", "layout");
  redirect(`/admin?tab=integrantes&pwd=${encodeURIComponent(password)}&msg=${encodeURIComponent(`Integrante ${name} criado.`)}`);
}

export async function updateMemberAction(formData: FormData) {
  const admin = await requireAdmin();
  const memberId = Number(formData.get("memberId"));
  const name = String(formData.get("name") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";
  const status = String(formData.get("status") ?? "active") === "inactive" ? "inactive" : "active";
  const accent = String(formData.get("accent") ?? "#a259ff");

  if (memberId === admin.id && role !== "admin") go("integrantes", "Você não pode remover o seu próprio acesso de administrador.");
  if (memberId === admin.id && status !== "active") go("integrantes", "Você não pode desativar a própria conta.");

  await db.update(members).set({ name, jobTitle, role, status, accent }).where(eq(members.id, memberId));
  await notify(memberId, "account", "Seu perfil foi atualizado", `Cargo, permissões ou status foram atualizados por ${admin.name}.`, "/configuracoes");
  await logAudit(admin.id, "member.updated", "member", memberId, `${admin.name} atualizou ${name} (cargo: ${jobTitle}, papel: ${role}, status: ${status}).`);
  revalidatePath("/", "layout");
  go("integrantes", "Integrante atualizado com sucesso.");
}

export async function resetMemberPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const memberId = Number(formData.get("memberId"));
  const password = generatePassword();
  await db.update(members).set({ passwordHash: hashPassword(password), mustChangePassword: true }).where(eq(members.id, memberId));
  await notify(memberId, "security", "Sua senha foi redefinida", "Um administrador redefiniu sua senha. Use a senha temporária enviada e altere em Configurações.", "/configuracoes");
  await logAudit(admin.id, "password.reset", "member", memberId, `${admin.name} redefiniu a senha de um integrante.`);
  redirect(`/admin?tab=integrantes&pwd=${encodeURIComponent(password)}&msg=${encodeURIComponent("Senha temporária gerada.")}`);
}

export async function saveActivityTypeAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "Geral").trim();
  const xp = Number(formData.get("xp"));
  const icon = String(formData.get("icon") ?? "zap");
  const active = String(formData.get("active") ?? "true") === "true";

  if (name.length < 3) go("tipos", "Informe o nome da atividade.");
  if (!Number.isFinite(xp) || xp < 1 || xp > 5000) go("tipos", "O XP deve estar entre 1 e 5000.");

  if (id) {
    await db.update(activityTypes).set({ name, category, xp, icon, active }).where(eq(activityTypes.id, id));
    await logAudit(admin.id, "activity_type.updated", "activity_type", id, `${admin.name} atualizou a atividade "${name}" para ${xp} XP.`);
  } else {
    let slug = slugify(name);
    const existing = await db.select({ id: activityTypes.id }).from(activityTypes).where(eq(activityTypes.slug, slug));
    if (existing.length) slug = `${slug}-${Date.now().toString().slice(-4)}`;
    const [created] = await db
      .insert(activityTypes)
      .values({ slug, name, category, xp, icon, active, sortOrder: 99 })
      .returning({ id: activityTypes.id });
    await logAudit(admin.id, "activity_type.created", "activity_type", created.id, `${admin.name} criou a atividade "${name}" valendo ${xp} XP.`);
  }
  revalidatePath("/", "layout");
  go("tipos", "Tipo de atividade salvo.");
}

export async function createMissionAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "daily");
  const scope = String(formData.get("scope") ?? "individual");
  const metric = String(formData.get("metric") ?? "activities");
  const target = Number(formData.get("target"));
  const xpReward = Number(formData.get("xpReward"));
  const startsAt = String(formData.get("startsAt") ?? todayISO());
  const endsAt = String(formData.get("endsAt") ?? addDaysISO(7));

  if (title.length < 3) go("missoes", "Informe um título para a missão.");
  if (!Number.isFinite(target) || target < 1) go("missoes", "A meta deve ser maior que zero.");
  if (!Number.isFinite(xpReward) || xpReward < 1) go("missoes", "A recompensa deve ser maior que zero.");
  if (endsAt < startsAt) go("missoes", "A data final deve ser depois do início.");

  const [created] = await db
    .insert(missions)
    .values({
      title,
      description: description || null,
      type,
      scope,
      metric,
      target,
      xpReward,
      startsAt,
      endsAt,
      status: "active",
      createdBy: admin.id,
    })
    .returning({ id: missions.id });

  await notifyEveryone(
    "mission",
    "Nova missão disponível",
    `${title} — recompensa de ${xpReward} XP.`,
    "/missoes",
    admin.id,
  );
  await logAudit(admin.id, "mission.created", "mission", created.id, `${admin.name} criou a missão "${title}" (${target} ${metric}, ${xpReward} XP).`);
  revalidatePath("/", "layout");
  go("missoes", "Missão criada e notificada para a equipe.");
}

export async function setMissionStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const missionId = Number(formData.get("missionId"));
  const status = String(formData.get("status") ?? "closed") === "active" ? "active" : "closed";
  const [record] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!record) go("missoes", "Missão não encontrada.");
  await db.update(missions).set({ status }).where(eq(missions.id, missionId));
  await logAudit(admin.id, "mission.status", "mission", missionId, `${admin.name} alterou a missão "${record.title}" para ${status}.`);
  revalidatePath("/", "layout");
  go("missoes", status === "active" ? "Missão reativada." : "Missão encerrada.");
}

export async function updateMissionAction(formData: FormData) {
  const admin = await requireAdmin();
  const missionId = Number(formData.get("missionId"));
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const target = Number(formData.get("target"));
  const xpReward = Number(formData.get("xpReward"));
  const endsAt = String(formData.get("endsAt") ?? addDaysISO(7));
  if (!title || !Number.isFinite(target) || !Number.isFinite(xpReward)) go("missoes", "Dados inválidos para a missão.");
  await db
    .update(missions)
    .set({ title, description: description || null, target, xpReward, endsAt })
    .where(eq(missions.id, missionId));
  await logAudit(admin.id, "mission.updated", "mission", missionId, `${admin.name} atualizou a missão "${title}".`);
  revalidatePath("/", "layout");
  go("missoes", "Missão atualizada.");
}

export async function deleteMissionAction(formData: FormData) {
  const admin = await requireAdmin();
  const missionId = Number(formData.get("missionId"));
  await db.delete(missions).where(eq(missions.id, missionId));
  await logAudit(admin.id, "mission.deleted", "mission", missionId, `${admin.name} excluiu uma missão.`);
  revalidatePath("/", "layout");
  go("missoes", "Missão excluída.");
}

export async function adjustXpAction(formData: FormData) {
  const admin = await requireAdmin();
  const memberId = Number(formData.get("memberId"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") ?? "").trim();
  const justification = String(formData.get("justification") ?? "").trim();

  if (!Number.isFinite(amount) || amount === 0) go("ajustes", "Informe um valor de XP diferente de zero.");
  if (Math.abs(amount) > 5000) go("ajustes", "O ajuste máximo por operação é de 5.000 XP.");
  if (reason.length < 3) go("ajustes", "Informe o motivo do ajuste.");
  if (justification.length < 10) go("ajustes", "A justificativa precisa ser detalhada (mínimo 10 caracteres).");

  const [target] = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (!target) go("ajustes", "Integrante não encontrado.");

  await applyXp({
    memberId,
    amount,
    reason,
    source: "adjustment",
    actorId: admin.id,
    note: justification,
    notifyMember: true,
  });
  await logAudit(admin.id, "xp.adjusted", "member", memberId, `${admin.name} ajustou ${amount} XP de ${target.name}. Motivo: ${reason}. Justificativa: ${justification}`);
  revalidatePath("/", "layout");
  go("ajustes", `Ajuste de ${amount} XP aplicado a ${target.name}.`);
}

export async function createAchievementAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const conditionType = String(formData.get("conditionType") ?? "activities");
  const target = Number(formData.get("target"));
  const xpReward = Number(formData.get("xpReward"));
  const icon = String(formData.get("icon") ?? "trophy");
  const rarity = String(formData.get("rarity") ?? "comum");

  if (name.length < 3) go("conquistas", "Informe o nome da conquista.");
  if (!description) go("conquistas", "Descreva a condição de desbloqueio.");
  if (!Number.isFinite(target) || target < 1) go("conquistas", "A meta deve ser maior que zero.");

  let slug = slugify(name);
  const existing = await db.select({ id: achievements.id }).from(achievements).where(eq(achievements.slug, slug));
  if (existing.length) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const [created] = await db
    .insert(achievements)
    .values({ slug, name, description, conditionType, target, xpReward: xpReward || 0, icon, rarity, sortOrder: 99 })
    .returning({ id: achievements.id });
  await logAudit(admin.id, "achievement.created", "achievement", created.id, `${admin.name} criou a conquista "${name}".`);
  revalidatePath("/", "layout");
  go("conquistas", "Conquista criada.");
}

export async function toggleAchievementAction(formData: FormData) {
  const admin = await requireAdmin();
  const achievementId = Number(formData.get("achievementId"));
  const active = String(formData.get("active") ?? "true") === "true";
  await db.update(achievements).set({ active }).where(eq(achievements.id, achievementId));
  await logAudit(admin.id, "achievement.toggled", "achievement", achievementId, `${admin.name} ${active ? "ativou" : "desativou"} uma conquista.`);
  revalidatePath("/", "layout");
  go("conquistas", "Conquista atualizada.");
}

export async function saveRankAction(formData: FormData) {
  const admin = await requireAdmin();
  const rankId = Number(formData.get("rankId"));
  const name = String(formData.get("name") ?? "").trim();
  const minXp = Number(formData.get("minXp"));
  const color = String(formData.get("color") ?? "#a259ff");
  if (!name) go("patentes", "Informe o nome da patente.");
  if (!Number.isFinite(minXp) || minXp < 0) go("patentes", "XP mínimo inválido.");
  await db.update(ranks).set({ name, minXp, color }).where(eq(ranks.id, rankId));
  await logAudit(admin.id, "rank.updated", "rank", rankId, `${admin.name} atualizou a patente "${name}" para ${minXp} XP.`);
  revalidatePath("/", "layout");
  go("patentes", "Patente atualizada.");
}

export async function recalculateAchievementsAction() {
  const admin = await requireAdmin();
  const allMembers = await db.select({ id: members.id }).from(members);
  const { evaluateAchievements } = await import("@/lib/gamification");
  let total = 0;
  for (const member of allMembers) {
    const unlocked = await evaluateAchievements(member.id);
    total += unlocked.length;
  }
  await logAudit(admin.id, "achievements.recalculated", "system", null, `${admin.name} recalculou conquistas (${total} desbloqueadas).`);
  revalidatePath("/", "layout");
  go("conquistas", `Conquistas recalculadas. ${total} novas medalhas desbloqueadas.`);
}

export async function memberCountAction() {
  await requireAdmin();
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(members);
  return Number(row?.total ?? 0);
}
