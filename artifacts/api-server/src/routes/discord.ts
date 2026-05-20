import { Router, type IRouter } from "express";
import { ChannelType, TextChannel } from "discord.js";
import { getDiscordClient, setupTicketPanel, createGiveaway, sendWelcomeTest } from "../lib/discord-bot";
import { db } from "@workspace/db";
import {
  guildSettingsTable,
  warningsTable,
  ticketsTable,
  ticketMessagesTable,
  xpTable,
  giveawaysTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

// ---- GUILDS ----
router.get("/discord/guilds", async (_req, res) => {
  try {
    const discord = await getDiscordClient();
    const guilds = discord.guilds.cache.map((guild) => ({
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      icon: guild.iconURL() ?? null,
      description: guild.description ?? null,
    }));
    res.json(guilds);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch guilds" });
  }
});

router.get("/discord/guilds/:guildId/channels", async (req, res) => {
  try {
    const discord = await getDiscordClient();
    const guild = discord.guilds.cache.get(req.params.guildId);
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }

    const channels = guild.channels.cache
      .filter((ch) => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(ch.type as number))
      .map((ch) => {
        const tc = ch as TextChannel;
        return {
          id: ch.id,
          name: ch.name,
          type: ChannelType[ch.type] ?? "UNKNOWN",
          topic: tc.topic ?? null,
          position: tc.position ?? 0,
        };
      })
      .sort((a, b) => a.position - b.position);

    res.json(channels);
  } catch {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

router.get("/discord/guilds/:guildId/roles", async (req, res) => {
  try {
    const discord = await getDiscordClient();
    const guild = discord.guilds.cache.get(req.params.guildId);
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }

    const roles = guild.roles.cache
      .filter((r) => !r.managed && r.name !== "@everyone")
      .map((r) => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position }))
      .sort((a, b) => b.position - a.position);

    res.json(roles);
  } catch {
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

router.get("/discord/guilds/:guildId/stats", async (req, res) => {
  try {
    const discord = await getDiscordClient();
    const guild = discord.guilds.cache.get(req.params.guildId);
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }

    res.json({
      totalMembers: guild.memberCount,
      totalChannels: guild.channels.cache.size,
      totalRoles: guild.roles.cache.size,
      onlineMembers: guild.members.cache.filter(
        (m) => ["online", "idle", "dnd"].includes(m.presence?.status ?? "")
      ).size,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/discord/channels/:channelId/messages", async (req, res) => {
  try {
    const { content, imageUrl } = req.body as { content?: string; imageUrl?: string };
    const discord = await getDiscordClient();
    const channel = discord.channels.cache.get(req.params.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      res.status(404).json({ error: "Channel not found" }); return;
    }
    const payload: { content?: string; embeds?: object[] } = {};
    if (content) payload.content = content;
    if (imageUrl) payload.embeds = [{ image: { url: imageUrl } }];
    const msg = await channel.send(payload);
    res.json({ id: msg.id, success: true });
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// ---- SETTINGS ----
router.get("/discord/guilds/:guildId/settings", async (req, res) => {
  try {
    const settings = await db.query.guildSettingsTable.findFirst({
      where: eq(guildSettingsTable.guildId, req.params.guildId),
    });
    if (!settings) {
      res.json({ guildId: req.params.guildId });
    } else {
      res.json(settings);
    }
  } catch {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/discord/guilds/:guildId/settings", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const body = req.body as Record<string, unknown>;
    delete body.id;
    delete body.updatedAt;

    const existing = await db.query.guildSettingsTable.findFirst({
      where: eq(guildSettingsTable.guildId, guildId),
    });

    if (existing) {
      const [updated] = await db
        .update(guildSettingsTable)
        .set({ ...body, updatedAt: new Date() } as typeof guildSettingsTable.$inferInsert)
        .where(eq(guildSettingsTable.guildId, guildId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(guildSettingsTable)
        .values({ guildId, ...body } as typeof guildSettingsTable.$inferInsert)
        .returning();
      res.json(created);
    }
  } catch {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ---- TICKET SETUP ----
router.post("/discord/channels/:channelId/ticket-panel", async (req, res) => {
  try {
    const guildId = req.body.guildId as string;
    await setupTicketPanel(req.params.channelId, guildId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to setup ticket panel" });
  }
});

// ---- WELCOME TEST ----
router.post("/discord/guilds/:guildId/welcome-test", async (req, res) => {
  try {
    await sendWelcomeTest(req.params.guildId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ---- TICKETS ----
router.get("/tickets", async (req, res) => {
  try {
    const { guildId, status } = req.query as { guildId?: string; status?: string };
    let rows = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
    if (guildId) rows = rows.filter((t) => t.guildId === guildId);
    if (status) rows = rows.filter((t) => t.status === status);
    res.json(rows.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), closedAt: t.closedAt?.toISOString() ?? null })));
  } catch {
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

router.get("/tickets/:ticketId/messages", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const rows = await db
      .select()
      .from(ticketMessagesTable)
      .where(eq(ticketMessagesTable.ticketId, ticketId))
      .orderBy(ticketMessagesTable.createdAt);
    res.json(rows.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ---- WARNINGS ----
router.get("/warnings", async (req, res) => {
  try {
    const { guildId } = req.query as { guildId?: string };
    let rows = await db.select().from(warningsTable).orderBy(desc(warningsTable.createdAt));
    if (guildId) rows = rows.filter((w) => w.guildId === guildId);
    res.json(rows.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: "Failed to list warnings" });
  }
});

router.post("/warnings/:userId/reset", async (req, res) => {
  try {
    const { guildId } = req.query as { guildId?: string };
    if (!guildId) { res.status(400).json({ error: "guildId required" }); return; }
    await db
      .update(warningsTable)
      .set({ count: 0 })
      .where(and(eq(warningsTable.userId, req.params.userId), eq(warningsTable.guildId, guildId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to reset warnings" });
  }
});

// ---- XP LEADERBOARD ----
router.get("/xp/leaderboard", async (req, res) => {
  try {
    const { guildId } = req.query as { guildId?: string };
    let rows = await db.select().from(xpTable).orderBy(desc(xpTable.xp));
    if (guildId) rows = rows.filter((x) => x.guildId === guildId);
    res.json(rows.slice(0, 50).map((x) => ({ ...x, updatedAt: x.updatedAt.toISOString() })));
  } catch {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ---- GIVEAWAYS ----
router.get("/giveaways", async (req, res) => {
  try {
    const { guildId } = req.query as { guildId?: string };
    let rows = await db.select().from(giveawaysTable).orderBy(desc(giveawaysTable.createdAt));
    if (guildId) rows = rows.filter((g) => g.guildId === guildId);
    res.json(
      rows.map((g) => ({
        ...g,
        endsAt: g.endsAt.toISOString(),
        createdAt: g.createdAt.toISOString(),
        participants: JSON.parse(g.participants ?? "[]"),
        winners: JSON.parse(g.winners ?? "[]"),
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch giveaways" });
  }
});

router.post("/giveaways", async (req, res) => {
  try {
    const { channelId, guildId, prize, winnersCount, durationMs, hostId, hostUsername } = req.body as {
      channelId: string;
      guildId: string;
      prize: string;
      winnersCount: number;
      durationMs: number;
      hostId: string;
      hostUsername: string;
    };
    await createGiveaway({ channelId, guildId, prize, winnersCount, durationMs, hostId, hostUsername });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ---- AUDIT LOGS ----
router.get("/audit-logs", async (req, res) => {
  try {
    const { guildId } = req.query as { guildId?: string };
    let rows = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt));
    if (guildId) rows = rows.filter((l) => l.guildId === guildId);
    res.json(rows.slice(0, 200).map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
