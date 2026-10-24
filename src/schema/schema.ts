import {
  pgTable, pgEnum, text, timestamp, uuid, varchar, index,
} from "drizzle-orm/pg-core";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending", "building", "active", "failed",
]);

export const sourceTypeEnum = pgEnum("source_type", ["zip", "github"]);

export const users = pgTable("user_signup", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userData = pgTable("user_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstname: varchar("firstname", { length: 255 }),
  lastname: varchar("lastname", { length: 255 }),
  githubUser: varchar("github_user", { length: 255 }),
  bio: text("bio"),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  status: deploymentStatusEnum("status").default("pending").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  logs: text("logs").default("").notNull(), // 👈 THIS IS THE NEW COLUMN
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});