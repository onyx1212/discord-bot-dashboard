import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const giveawaysTable = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  messageId: text("message_id"),
  channelId: text("channel_id").notNull(),
  guildId: text("guild_id").notNull(),
  prize: text("prize").notNull(),
  winnersCount: integer("winners_count").notNull().default(1),
  hostId: text("host_id").notNull(),
  hostUsername: text("host_username").notNull(),
  participants: text("participants").notNull().default("[]"),
  winners: text("winners").notNull().default("[]"),
  active: boolean("active").notNull().default(true),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGiveawaySchema = createInsertSchema(giveawaysTable).omit({ id: true, createdAt: true });
export type InsertGiveaway = z.infer<typeof insertGiveawaySchema>;
export type Giveaway = typeof giveawaysTable.$inferSelect;
