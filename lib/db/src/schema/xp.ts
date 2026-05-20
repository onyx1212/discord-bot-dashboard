import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const xpTable = pgTable("xp", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  username: text("username").notNull(),
  guildId: text("guild_id").notNull(),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertXpSchema = createInsertSchema(xpTable).omit({ id: true, updatedAt: true });
export type InsertXp = z.infer<typeof insertXpSchema>;
export type Xp = typeof xpTable.$inferSelect;
