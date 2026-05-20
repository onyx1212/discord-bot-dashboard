import {
  Client,
  GatewayIntentBits,
  TextChannel,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  GuildMember,
  Message,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonInteraction,
  Events,
  Collection,
} from "discord.js";
import Groq from "groq-sdk";
import { db } from "@workspace/db";
import {
  warningsTable,
  ticketsTable,
  ticketMessagesTable,
  guildSettingsTable,
  xpTable,
  giveawaysTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

let client: Client | null = null;
let groqClient: Groq | null = null;

function getGroq(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

// ---------- SPAM TRACKER ----------
const spamTracker = new Map<string, { count: number; resetAt: number }>();

// ---------- HELPERS ----------
function interpolate(template: string, vars: Record<string, string>) {
  return template
    .replace(/{user}/g, vars.user ?? "")
    .replace(/{server}/g, vars.server ?? "")
    .replace(/{memberCount}/g, vars.memberCount ?? "");
}

async function getSettings(guildId: string) {
  const settings = await db.query.guildSettingsTable.findFirst({
    where: eq(guildSettingsTable.guildId, guildId),
  });
  return settings ?? null;
}

async function logAction(
  guildId: string,
  action: string,
  opts?: {
    userId?: string;
    username?: string;
    targetId?: string;
    targetUsername?: string;
    reason?: string;
    details?: string;
  }
) {
  await db.insert(auditLogsTable).values({
    guildId,
    action,
    userId: opts?.userId ?? null,
    username: opts?.username ?? null,
    targetId: opts?.targetId ?? null,
    targetUsername: opts?.targetUsername ?? null,
    reason: opts?.reason ?? null,
    details: opts?.details ?? null,
  }).catch(() => {});

  const settings = await getSettings(guildId);
  if (!settings?.loggingEnabled || !settings?.loggingChannelId) return;

  const discord = client;
  if (!discord) return;

  const ch = discord.channels.cache.get(settings.loggingChannelId) as TextChannel | undefined;
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📋 ${action}`)
    .setTimestamp();

  if (opts?.username) embed.addFields({ name: "المستخدم", value: `${opts.username} (${opts.userId})`, inline: true });
  if (opts?.targetUsername) embed.addFields({ name: "الهدف", value: `${opts.targetUsername} (${opts.targetId})`, inline: true });
  if (opts?.reason) embed.addFields({ name: "السبب", value: opts.reason, inline: false });
  if (opts?.details) embed.addFields({ name: "التفاصيل", value: opts.details, inline: false });

  await ch.send({ embeds: [embed] }).catch(() => {});
}

// ---------- MODERATION ----------
async function moderateMessage(message: Message) {
  if (message.author.bot || !message.guild) return;
  const channel = message.channel;
  if (!(channel instanceof TextChannel)) return;

  const settings = await getSettings(message.guild.id);
  if (!settings?.moderationEnabled) return;

  // Check banned words first (fast path)
  const bannedWords = settings.bannedWords
    ? settings.bannedWords.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean)
    : [];

  const content = message.content.toLowerCase();
  const hasBannedWord = bannedWords.some((w) => w && content.includes(w));

  // Check if channel should be moderated
  const shouldModerate =
    settings.moderationChannels === "all" ||
    channel.name.toLowerCase().includes("general") ||
    channel.name.toLowerCase().includes("عام") ||
    channel.name.toLowerCase().includes("chat") ||
    channel.name.toLowerCase().includes("شات");

  if (!shouldModerate) return;

  // Anti-spam check
  if (settings.antiSpamEnabled) {
    const threshold = parseInt(settings.antiSpamThreshold ?? "5");
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const tracker = spamTracker.get(key);

    if (!tracker || now > tracker.resetAt) {
      spamTracker.set(key, { count: 1, resetAt: now + 5000 });
    } else {
      tracker.count++;
      if (tracker.count > threshold) {
        await message.delete().catch(() => {});
        await channel
          .send({ content: `🚫 <@${message.author.id}> توقف عن الإرسال المتكرر! (سبام)` })
          .catch(() => {});
        await logAction(message.guild.id, "حذف رسالة سبام", {
          userId: message.author.id,
          username: message.author.username,
          reason: "تجاوز حد الرسائل",
        });
        return;
      }
    }
  }

  if (!hasBannedWord && !process.env.GROQ_API_KEY) return;

  let shouldDelete = hasBannedWord;
  let reason = hasBannedWord ? "كلمة محظورة" : "";

  const groq = getGroq();
  if (!hasBannedWord && groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `أنت مشرف دردشة Discord. حلّل الرسالة التالية وحدد إذا كانت تحتوي على:
- سب أو شتائم أو إهانات
- تهديدات أو ترهيب
- احتيال أو نصب أو روابط مشبوهة
- محتوى جنسي أو إباحي
- عنصرية أو تمييز
- مضايقة أو تنمر
- محتوى مسيء بشكل واضح

أجب فقط بـ JSON: {"should_delete": true/false, "reason": "السبب بالعربية"}
إذا الرسالة عادية أجب: {"should_delete": false, "reason": ""}`,
          },
          { role: "user", content: message.content },
        ],
        temperature: 0.1,
        max_tokens: 100,
      });

      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      const parsed = JSON.parse(text) as { should_delete: boolean; reason: string };
      shouldDelete = parsed.should_delete;
      reason = parsed.reason || "مخالفة قواعد المجتمع";
    } catch {
      return;
    }
  }

  if (!shouldDelete) return;

  await message.delete().catch(() => {});

  const userId = message.author.id;
  const guildId = message.guild.id;

  // Upsert warning count
  const existing = await db.query.warningsTable.findFirst({
    where: and(eq(warningsTable.userId, userId), eq(warningsTable.guildId, guildId)),
  });

  const newCount = (existing?.count ?? 0) + 1;

  if (existing) {
    await db
      .update(warningsTable)
      .set({ count: newCount, reason, createdAt: new Date() })
      .where(eq(warningsTable.id, existing.id));
  } else {
    await db.insert(warningsTable).values({
      userId,
      username: message.author.username,
      guildId,
      count: 1,
      reason,
    });
  }

  await logAction(guildId, "حذف رسالة مسيئة", {
    userId,
    username: message.author.username,
    reason,
    details: message.content.substring(0, 200),
  });

  const member = message.guild.members.cache.get(userId);

  if (newCount === 1) {
    await channel
      .send({ content: `⚠️ <@${userId}> **تحذير أول**: تم حذف رسالتك — ${reason}` })
      .catch(() => {});
  } else if (newCount === 2) {
    await channel
      .send({ content: `⚠️ <@${userId}> **تحذير ثاني**: هذا تحذيرك الثاني — ${reason}` })
      .catch(() => {});
  } else if (newCount >= 3) {
    await channel
      .send({
        content: `🔇 <@${userId}> **تحذير ثالث**: تم إيقافك مؤقتاً لمدة 10 دقائق — ${reason}`,
      })
      .catch(() => {});
    if (member) {
      await member.timeout(10 * 60 * 1000, "ثلاثة تحذيرات متكررة").catch(() => {});
    }
    await db
      .update(warningsTable)
      .set({ count: 0 })
      .where(and(eq(warningsTable.userId, userId), eq(warningsTable.guildId, guildId)));

    await logAction(guildId, "إيقاف مؤقت تلقائي", {
      userId,
      username: message.author.username,
      reason: "ثلاثة تحذيرات متكررة",
    });
  }
}

// ---------- XP ----------
async function handleXp(message: Message) {
  if (message.author.bot || !message.guild) return;
  const settings = await getSettings(message.guild.id);
  if (!settings?.xpEnabled) return;

  const xpPerMsg = parseInt(settings.xpPerMessage ?? "10") + Math.floor(Math.random() * 5);
  const userId = message.author.id;
  const guildId = message.guild.id;

  const existing = await db.query.xpTable.findFirst({
    where: and(eq(xpTable.userId, userId), eq(xpTable.guildId, guildId)),
  });

  if (!existing) {
    await db.insert(xpTable).values({
      userId,
      username: message.author.username,
      guildId,
      xp: xpPerMsg,
      level: 1,
    }).catch(() => {});
    return;
  }

  const newXp = existing.xp + xpPerMsg;
  const newLevel = Math.floor(0.1 * Math.sqrt(newXp)) + 1;
  const leveledUp = newLevel > existing.level;

  await db
    .update(xpTable)
    .set({ xp: newXp, level: newLevel, username: message.author.username, updatedAt: new Date() })
    .where(eq(xpTable.id, existing.id));

  if (leveledUp && message.channel instanceof TextChannel) {
    await message.channel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle("🎉 ترقية مستوى!")
            .setDescription(`مبروك <@${userId}>! وصلت للمستوى **${newLevel}** 🚀`)
            .setThumbnail(message.author.displayAvatarURL()),
        ],
      })
      .catch(() => {});
  }
}

// ---------- TICKET MESSAGES ----------
async function handleTicketMessage(message: Message) {
  if (message.author.bot || !message.guild) return;
  const channel = message.channel;
  if (!(channel instanceof TextChannel)) return;
  if (!channel.name.startsWith("ticket-")) return;

  const ticket = await db.query.ticketsTable.findFirst({
    where: and(eq(ticketsTable.channelId, channel.id), eq(ticketsTable.status, "open")),
  });
  if (!ticket) return;

  await db.insert(ticketMessagesTable).values({
    ticketId: ticket.id,
    userId: message.author.id,
    username: message.author.username,
    content: message.content,
  }).catch(() => {});
}

// ---------- GIVEAWAY CHECKER ----------
async function checkGiveaways() {
  if (!client) return;
  try {
    const now = new Date();
    const expired = await db.query.giveawaysTable.findMany({
      where: and(eq(giveawaysTable.active, true)),
    });

    for (const giveaway of expired) {
      if (giveaway.endsAt > now) continue;

      const participants: string[] = JSON.parse(giveaway.participants ?? "[]");
      if (participants.length === 0) {
        await db.update(giveawaysTable).set({ active: false }).where(eq(giveawaysTable.id, giveaway.id));
        continue;
      }

      const shuffled = participants.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, Math.min(giveaway.winnersCount, shuffled.length));

      await db
        .update(giveawaysTable)
        .set({ active: false, winners: JSON.stringify(winners) })
        .where(eq(giveawaysTable.id, giveaway.id));

      const channel = client.channels.cache.get(giveaway.channelId) as TextChannel | undefined;
      if (channel) {
        const winnerMentions = winners.map((id) => `<@${id}>`).join(", ");
        await channel
          .send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xffd700)
                .setTitle("🎉 انتهى السحب!")
                .setDescription(
                  `**الجائزة:** ${giveaway.prize}\n**الفائزون:** ${winnerMentions}\nتهانينا! 🎊`
                )
                .setTimestamp(),
            ],
          })
          .catch(() => {});
      }
    }
  } catch {
    // silent
  }
}

// ---------- SLASH COMMANDS HANDLER ----------
async function handleSlashCommand(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  // handled via interactionCreate
}

// ---------- MAIN CLIENT ----------
export async function getDiscordClient(): Promise<Client> {
  if (client && client.isReady()) return client;

  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ];

  client = new Client({ intents });

  client.once(Events.ClientReady, () => {
    logger.info({ tag: client!.user?.tag }, "Discord bot ready");
    setInterval(checkGiveaways, 30000);
  });

  // Welcome + Auto-role
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      const settings = await getSettings(member.guild.id);
      if (!settings) return;

      // Auto-role
      if (settings.autoRoleEnabled && settings.autoRoleId) {
        const role = member.guild.roles.cache.get(settings.autoRoleId);
        if (role) await member.roles.add(role).catch(() => {});
      }

      // Welcome message
      if (settings.welcomeEnabled && settings.welcomeChannelId) {
        const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannelId) as
          | TextChannel
          | undefined;
        if (!welcomeChannel) return;

        const vars = {
          user: `<@${member.id}>`,
          server: member.guild.name,
          memberCount: member.guild.memberCount.toString(),
        };

        const embed = new EmbedBuilder()
          .setColor(parseInt(settings.welcomeColor.replace("#", ""), 16) || 0x5865f2)
          .setTitle(interpolate(settings.welcomeTitle, vars))
          .setDescription(interpolate(settings.welcomeMessage, vars))
          .setTimestamp();

        if (settings.welcomeShowAvatar) {
          embed.setThumbnail(member.user.displayAvatarURL());
        }

        await welcomeChannel.send({ embeds: [embed] }).catch(() => {});
      }

      await logAction(member.guild.id, "انضمام عضو جديد", {
        userId: member.id,
        username: member.user.username,
      });
    } catch (err) {
      logger.error({ err }, "Welcome/role error");
    }
  });

  // Log member leave
  client.on(Events.GuildMemberRemove, async (member) => {
    try {
      await logAction(member.guild.id, "مغادرة عضو", {
        userId: member.id,
        username: (member as GuildMember).user?.username ?? "unknown",
      });
    } catch {}
  });

  // Log message delete
  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;
    try {
      await logAction(message.guild.id, "حذف رسالة", {
        userId: message.author?.id,
        username: message.author?.username,
        details: message.content?.substring(0, 200) ?? "(محتوى غير معروف)",
      });
    } catch {}
  });

  // Interactions (buttons / menus)
  client.on(Events.InteractionCreate, async (interaction) => {
    // Open ticket button
    if (interaction.isButton() && interaction.customId === "open_ticket") {
      const guild = interaction.guild;
      if (!guild || !interaction.member) return;
      const member = interaction.member as GuildMember;
      const settings = await getSettings(guild.id);

      try {
        const existingTicket = await db.query.ticketsTable.findFirst({
          where: and(
            eq(ticketsTable.userId, member.id),
            eq(ticketsTable.guildId, guild.id),
            eq(ticketsTable.status, "open")
          ),
        });

        if (existingTicket) {
          await interaction.reply({
            content: `❌ لديك تذكرة مفتوحة بالفعل: <#${existingTicket.channelId}>`,
            flags: 64,
          });
          return;
        }

        const ticketChannel = await guild.channels.create({
          name: `ticket-${member.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
              id: member.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        });

        const category = settings?.ticketCategory ?? "دعم عام";

        const ticket = await db
          .insert(ticketsTable)
          .values({
            channelId: ticketChannel.id,
            userId: member.id,
            username: member.user.username,
            guildId: guild.id,
            category,
            status: "open",
          })
          .returning();

        const closeBtn = new ButtonBuilder()
          .setCustomId(`close_ticket_${ticket[0].id}`)
          .setLabel("إغلاق التذكرة")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeBtn);

        const vars = {
          user: `<@${member.id}>`,
          server: guild.name,
          memberCount: guild.memberCount.toString(),
        };

        const ticketMsg = interpolate(
          settings?.ticketMessage ?? "مرحباً {user}!\n\nتم فتح تذكرتك. سيتواصل معك فريق الدعم قريباً.",
          vars
        );

        await ticketChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle(`🎫 تذكرة دعم — ${category}`)
              .setDescription(ticketMsg)
              .setTimestamp(),
          ],
          components: [row],
        });

        await interaction.reply({ content: `✅ تم فتح تذكرتك: <#${ticketChannel.id}>`, flags: 64 });

        await logAction(guild.id, "فتح تذكرة جديدة", {
          userId: member.id,
          username: member.user.username,
        });
      } catch (err) {
        logger.error({ err }, "Ticket creation error");
        await interaction.reply({ content: "❌ حدث خطأ أثناء فتح التذكرة.", flags: 64 }).catch(() => {});
      }
    }

    // Close ticket button
    if (interaction.isButton() && interaction.customId.startsWith("close_ticket_")) {
      const ticketId = parseInt(interaction.customId.replace("close_ticket_", ""));
      const guild = interaction.guild;
      if (!guild) return;

      try {
        const ticket = await db.query.ticketsTable.findFirst({
          where: eq(ticketsTable.id, ticketId),
        });

        await db
          .update(ticketsTable)
          .set({ status: "closed", closedAt: new Date() })
          .where(eq(ticketsTable.id, ticketId));

        await interaction.reply({ content: "🔒 تم إغلاق التذكرة." });

        await logAction(guild.id, "إغلاق تذكرة", {
          userId: interaction.user.id,
          username: interaction.user.username,
          targetId: ticket?.userId,
          targetUsername: ticket?.username,
        });

        const channel = interaction.channel as TextChannel;
        setTimeout(() => channel.delete().catch(() => {}), 5000);
      } catch (err) {
        logger.error({ err }, "Ticket close error");
      }
    }

    // Giveaway join button
    if (interaction.isButton() && interaction.customId.startsWith("join_giveaway_")) {
      const giveawayId = parseInt(interaction.customId.replace("join_giveaway_", ""));
      try {
        const giveaway = await db.query.giveawaysTable.findFirst({
          where: and(eq(giveawaysTable.id, giveawayId), eq(giveawaysTable.active, true)),
        });

        if (!giveaway) {
          await interaction.reply({ content: "❌ هذا السحب منتهي.", flags: 64 });
          return;
        }

        const participants: string[] = JSON.parse(giveaway.participants ?? "[]");
        if (participants.includes(interaction.user.id)) {
          await interaction.reply({ content: "✅ أنت مسجل بالفعل في هذا السحب!", flags: 64 });
          return;
        }

        participants.push(interaction.user.id);
        await db
          .update(giveawaysTable)
          .set({ participants: JSON.stringify(participants) })
          .where(eq(giveawaysTable.id, giveawayId));

        await interaction.reply({ content: `🎉 تم تسجيلك في سحب **${giveaway.prize}**!`, flags: 64 });
      } catch (err) {
        logger.error({ err }, "Giveaway join error");
      }
    }
  });

  // Messages
  client.on(Events.MessageCreate, async (message: Message) => {
    await Promise.all([
      moderateMessage(message),
      handleTicketMessage(message),
      handleXp(message),
    ]);
  });

  await client.login(process.env.DISCORD_BOT_TOKEN);

  await new Promise<void>((resolve, reject) => {
    client!.once(Events.ClientReady, () => resolve());
    client!.once(Events.Error, reject);
    setTimeout(() => reject(new Error("Discord client login timeout")), 20000);
  });

  return client;
}

// ---------- SETUP FUNCTIONS ----------

export async function setupTicketPanel(channelId: string, guildId: string): Promise<void> {
  const discord = await getDiscordClient();
  const channel = discord.channels.cache.get(channelId) as TextChannel;
  if (!channel) throw new Error("Channel not found");

  const settings = await getSettings(guildId);
  const category = settings?.ticketCategory ?? "دعم عام";

  const button = new ButtonBuilder()
    .setCustomId("open_ticket")
    .setLabel("فتح تذكرة")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎫");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎫 نظام التذاكر")
        .setDescription(
          `اضغط على الزر أدناه لفتح تذكرة دعم — **${category}**\nسيتواصل معك الفريق في أقرب وقت!`
        )
        .setTimestamp(),
    ],
    components: [row],
  });

  await db
    .insert(guildSettingsTable)
    .values({ guildId, ticketEnabled: true, ticketChannelId: channelId })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: { ticketEnabled: true, ticketChannelId: channelId, updatedAt: new Date() },
    });
}

export async function createGiveaway(opts: {
  channelId: string;
  guildId: string;
  prize: string;
  winnersCount: number;
  durationMs: number;
  hostId: string;
  hostUsername: string;
}): Promise<void> {
  const discord = await getDiscordClient();
  const channel = discord.channels.cache.get(opts.channelId) as TextChannel;
  if (!channel) throw new Error("Channel not found");

  const endsAt = new Date(Date.now() + opts.durationMs);

  const [giveaway] = await db
    .insert(giveawaysTable)
    .values({
      channelId: opts.channelId,
      guildId: opts.guildId,
      prize: opts.prize,
      winnersCount: opts.winnersCount,
      hostId: opts.hostId,
      hostUsername: opts.hostUsername,
      participants: "[]",
      winners: "[]",
      active: true,
      endsAt,
    })
    .returning();

  const joinBtn = new ButtonBuilder()
    .setCustomId(`join_giveaway_${giveaway.id}`)
    .setLabel("🎉 اشترك")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(joinBtn);

  const msg = await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle("🎉 سحب جديد!")
        .addFields(
          { name: "الجائزة", value: opts.prize, inline: true },
          { name: "عدد الفائزين", value: opts.winnersCount.toString(), inline: true },
          { name: "ينتهي في", value: `<t:${Math.floor(endsAt.getTime() / 1000)}:R>`, inline: true },
          { name: "بواسطة", value: `<@${opts.hostId}>`, inline: true }
        )
        .setTimestamp(),
    ],
    components: [row],
  });

  await db
    .update(giveawaysTable)
    .set({ messageId: msg.id })
    .where(eq(giveawaysTable.id, giveaway.id));
}

export async function sendWelcomeTest(guildId: string): Promise<void> {
  const discord = await getDiscordClient();
  const settings = await getSettings(guildId);
  if (!settings?.welcomeChannelId) throw new Error("Welcome channel not configured");

  const channel = discord.channels.cache.get(settings.welcomeChannelId) as TextChannel;
  if (!channel) throw new Error("Channel not found");

  const vars = {
    user: `<@${discord.user!.id}>`,
    server: discord.guilds.cache.get(guildId)?.name ?? "السيرفر",
    memberCount: discord.guilds.cache.get(guildId)?.memberCount.toString() ?? "0",
  };

  const embed = new EmbedBuilder()
    .setColor(parseInt(settings.welcomeColor.replace("#", ""), 16) || 0x5865f2)
    .setTitle(interpolate(settings.welcomeTitle, vars))
    .setDescription(interpolate(settings.welcomeMessage, vars))
    .setTimestamp();

  if (settings.welcomeShowAvatar) embed.setThumbnail(discord.user!.displayAvatarURL());

  await channel.send({ embeds: [embed] });
}
