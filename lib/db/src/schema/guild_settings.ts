import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildSettingsTable = pgTable("guild_settings", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull().unique(),
  welcomeEnabled: boolean("welcome_enabled").notNull().default(false),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeTitle: text("welcome_title").notNull().default("🎉 مرحباً بك!"),
  welcomeMessage: text("welcome_message").notNull().default("أهلاً وسهلاً {user} في {server}!\n\nنحن سعداء بانضمامك."),
  welcomeColor: text("welcome_color").notNull().default("#5865F2"),
  welcomeShowAvatar: boolean("welcome_show_avatar").notNull().default(true),
  autoRoleEnabled: boolean("auto_role_enabled").notNull().default(false),
  autoRoleId: text("auto_role_id"),
  ticketEnabled: boolean("ticket_enabled").notNull().default(false),
  ticketChannelId: text("ticket_channel_id"),
  ticketCategory: text("ticket_category").notNull().default("دعم عام"),
  ticketMessage: text("ticket_message").notNull().default("مرحباً {user}!\n\nتم فتح تذكرتك. سيتواصل معك فريق الدعم قريباً."),
  loggingEnabled: boolean("logging_enabled").notNull().default(false),
  loggingChannelId: text("logging_channel_id"),
  moderationEnabled: boolean("moderation_enabled").notNull().default(true),
  moderationChannels: text("moderation_channels").notNull().default("all"),
  antiSpamEnabled: boolean("anti_spam_enabled").notNull().default(false),
  antiSpamThreshold: text("anti_spam_threshold").notNull().default("5"),
  xpEnabled: boolean("xp_enabled").notNull().default(false),
  xpPerMessage: text("xp_per_message").notNull().default("10"),
  bannedWords: text("banned_words").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuildSettingsSchema = createInsertSchema(guildSettingsTable).omit({ id: true, updatedAt: true });
export type InsertGuildSettings = z.infer<typeof insertGuildSettingsSchema>;
export type GuildSettings = typeof guildSettingsTable.$inferSelect;
