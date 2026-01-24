import {
  mysqlTable,
  varchar,
  boolean,
  timestamp,
  int,
  json,
  binary,
  bigint,
  varbinary,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// Users table
export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  approved: boolean("approved").default(false).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
});

// Credentials table (WebAuthn)
export const credentials = mysqlTable("credentials", {
  id: varbinary("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: binary("public_key").notNull(),
  attestationType: varchar("attestation_type", { length: 255 }).notNull(),
  aaguid: varbinary("aaguid", { length: 255 }).notNull(),
  signCount: bigint("sign_count", { mode: "number" }).notNull(),
  cloneWarning: boolean("clone_warning").notNull(),
  backupEligible: boolean("backup_eligible").notNull(),
  backupState: boolean("backup_state").notNull(),
});

// Services table
export const services = mysqlTable("services", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }).notNull(),
  group: varchar("group", { length: 255 }).notNull(),
  order: int("order").default(0).notNull(),
  public: boolean("public").default(false).notNull(),
  authRequired: boolean("auth_required").default(false).notNull(),
  newTab: boolean("new_tab").default(true).notNull(),
  checkHealth: boolean("check_health").default(false).notNull(),
  healthStatus: varchar("health_status", { length: 50 })
    .default("unknown")
    .notNull(),
  lastChecked: timestamp("last_checked"),
});

// Embed configurations table
export const embedConfigs = mysqlTable("embed_configs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'status', 'uptime', 'metrics', etc.
  apiKey: varchar("api_key", { length: 255 }).notNull().unique(),
  apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull(),
  allowedOrigins: json("allowed_origins")
    .$type<string[]>()
    .default([])
    .notNull(),
  dataEndpoint: varchar("data_endpoint", { length: 255 }), // Custom endpoint or null for default
  refreshInterval: int("refresh_interval").default(60).notNull(), // seconds
  settings: json("settings").$type<Record<string, any>>().default({}).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service widgets table - customizable info cards for services
export const serviceWidgets = mysqlTable("service_widgets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  serviceId: varchar("service_id", { length: 255 })
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // 'metric', 'chart', 'info', 'link', 'status'
  title: varchar("title", { length: 255 }).notNull(),
  content: json("content").$type<Record<string, any>>().notNull(), // Flexible content storage
  settings: json("settings").$type<Record<string, any>>().default({}).notNull(),
  order: int("order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Widgets removed - tables dropped via migration
// If you need the schema, refer to previous migration files for the original definitions.

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
  embedConfigs: many(embedConfigs),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}));

export const embedConfigsRelations = relations(embedConfigs, ({ one }) => ({
  user: one(users, {
    fields: [embedConfigs.userId],
    references: [users.id],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  widgets: many(serviceWidgets),
}));

export const serviceWidgetsRelations = relations(serviceWidgets, ({ one }) => ({
  service: one(services, {
    fields: [serviceWidgets.serviceId],
    references: [services.id],
  }),
}));
