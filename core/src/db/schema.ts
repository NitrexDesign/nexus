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

// Widget settings table
export const widgetSettings = mysqlTable("widget_settings", {
  id: varchar("id", { length: 255 }).primaryKey().default("default"),
  categoryOrder: json("category_order").$type<string[]>(),
  gridCols: int("grid_cols").default(4).notNull(),
  gridRows: int("grid_rows").default(6).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Widget configs table
export const widgetConfigs = mysqlTable("widget_configs", {
  id: varchar("id", { length: 255 }).primaryKey(),
  widgetType: varchar("widget_type", { length: 255 }).notNull(),
  positionX: int("position_x").notNull(),
  positionY: int("position_y").notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  settings: json("settings").$type<Record<string, any>>().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(credentials),
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),
}));
