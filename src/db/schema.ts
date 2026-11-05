import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  jobTitle: text("job_title").notNull().default("Integrante"),
  role: text("role").notNull().default("member"),
  accent: text("accent").notNull().default("#a259ff"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  status: text("status").notNull().default("active"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ranks = pgTable("ranks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  minXp: integer("min_xp").notNull(),
  tier: integer("tier").notNull(),
  color: text("color").notNull().default("#a259ff"),
  description: text("description"),
});

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  xp: integer("xp").notNull(),
  icon: text("icon").notNull().default("zap"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  typeId: integer("type_id")
    .notNull()
    .references(() => activityTypes.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  occurredAt: date("occurred_at", { mode: "string" }).notNull(),
  status: text("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  proofName: text("proof_name"),
  proofData: text("proof_data"),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  reviewerId: integer("reviewer_id").references(() => members.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const xpTransactions = pgTable("xp_transactions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  source: text("source").notNull().default("activity"),
  referenceId: integer("reference_id"),
  actorId: integer("actor_id").references(() => members.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  conditionType: text("condition_type").notNull(),
  target: integer("target").notNull().default(1),
  xpReward: integer("xp_reward").notNull().default(0),
  icon: text("icon").notNull().default("trophy"),
  rarity: text("rarity").notNull().default("comum"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const memberAchievements = pgTable(
  "member_achievements",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    achievementId: integer("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("member_achievements_unique").on(table.memberId, table.achievementId)],
);

export const missions = pgTable("missions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("daily"),
  scope: text("scope").notNull().default("individual"),
  metric: text("metric").notNull().default("activities"),
  target: integer("target").notNull().default(1),
  xpReward: integer("xp_reward").notNull().default(50),
  startsAt: date("starts_at", { mode: "string" }).notNull(),
  endsAt: date("ends_at", { mode: "string" }).notNull(),
  status: text("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => members.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const missionClaims = pgTable(
  "mission_claims",
  {
    id: serial("id").primaryKey(),
    missionId: integer("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    xpAwarded: integer("xp_awarded").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("mission_claims_unique").on(table.missionId, table.memberId)],
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => members.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
