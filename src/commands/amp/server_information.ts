import {
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  MessageFlags,
} from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import Amp from '../../amp/ads/Amp';
import Instance from '../../types/Instance';
import ColorText from '../../utility/ColorText';
import CustomClient from '../../CustomClient';
import logger from '../../utility/Logger';
import { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand';
import { AppState, MetricKey } from '../../types/AppState';
import Servers from '../../utility/Servers';
import Instances from '../../utility/Instances';

export default class ServersPanel implements BaseCommand {
  enabled: boolean = true;
  static commandName: string = "server_information";
  static commandDescription: string = "Display AMP server information.txt";

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(ServersPanel.commandName)
      .setDescription(ServersPanel.commandDescription)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
  }

  async createCommandFunctionality(): Promise<
    (interaction: ChatInputCommandInteraction) => Promise<any>
  > {
    return async (interaction: ChatInputCommandInteraction) => {
      const client =
        interaction.client as CustomClient; /** Cast to your custom client */
      const guild = interaction.guild;

      if (!guild) {
        return await interaction.reply("❌ Guild not found.");
      }

      /** If the panel is running, stop it */
      if (client.updateInterval) {
        clearInterval(client.updateInterval); /** Stop the interval */
        client.cleanupState(); /** Clean up the state */
        return await interaction.reply(
          "✅ Server status panel has been stopped.",
        );
      }

      /** Initialize state and AMP instance */
      client.initializeState();
      const amp = client.getAmpInstance();
      await amp.login();

      await interaction.deferReply();

      let channel: TextChannel = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildText && ch.name === "server-information",
      ) as TextChannel;

      if (!channel) {
        channel = (await guild.channels.create({
          name: "server-information",
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id /** @everyone role ID */,
              deny: [
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageWebhooks,
                PermissionFlagsBits.CreateInstantInvite,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.SendMessagesInThreads,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.UseExternalStickers,
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageThreads,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.SendTTSMessages,
                PermissionFlagsBits.SendVoiceMessages,
                PermissionFlagsBits.SendPolls,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.Stream,
                PermissionFlagsBits.UseSoundboard,
                PermissionFlagsBits.UseExternalSounds,
                PermissionFlagsBits.UseVAD,
                PermissionFlagsBits.PrioritySpeaker,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.UseApplicationCommands,
                PermissionFlagsBits.UseEmbeddedActivities,
                PermissionFlagsBits.UseExternalApps,
                PermissionFlagsBits.RequestToSpeak,
                PermissionFlagsBits.CreateEvents,
                PermissionFlagsBits.ManageEvents,
              ],
            },
          ],
        })) as TextChannel;
      }

      await interaction.editReply("✅ Server status panel started.");

      const messageCache = client.messageCache!;
      /** Ensure the static server information.txt message exists as plain text (not an embed) */
      const firstEnsure = await this.ensureOrUpdateStaticInfo(channel);
      let forceRecreateEmbeds =
        firstEnsure.created; /** if we just posted the static, recreate embeds to appear below it */
      const updateLoop = async () => {
        try {
          logger.info(
            `[ServersPanel] Starting update cycle for guild ${guild.id}`,
          );
          /** On every cycle, check if static content changed and update it in place (no reordering) */
          const ensureResult = await this.ensureOrUpdateStaticInfo(channel);
          if (ensureResult.created) {
            /** If the static had to be recreated (e.g., deleted manually), force one-time embed recreation */
            forceRecreateEmbeds = true;
            logger.info(
              `[ServersPanel] Static info recreated, forcing embed refresh.`,
            );
          }
          await this.updateServerStatus(
            amp,
            channel,
            messageCache,
            forceRecreateEmbeds,
          );
          /** Only force recreation once, after a successful update */
          if (forceRecreateEmbeds) forceRecreateEmbeds = false;
          logger.info(
            `[ServersPanel] Update cycle completed for guild ${guild.id}`,
          );
        } catch (error) {
          logger.error(
            `[ServersPanel] Error updating server status for guild ${guild.id}:`,
            error,
          );
        }
      };

      /**
       * Start the update loop
       * Run every 3 minutes
       */
      client.updateInterval = setInterval(updateLoop, 180_000);

      /** Run the first update immediately */
      await updateLoop();
    };
  }

  private async updateServerStatus(
    amp: Amp,
    channel: TextChannel,
    messageCache: Map<string, string>,
    forceRecreateEmbeds: boolean = false,
  ) {
    try {
      const instancesService = new Instances(amp);
      const minecraftServers = await instancesService.getMinecraftInstances();
      const hytaleServers = await instancesService.getHytaleInstances();

      const servers = await amp.readFile([
        ...minecraftServers,
        ...hytaleServers,
      ]);
      if (!servers) return;

      /** Update in-memory cache so commands can use fresh data */
      Servers.setAll(servers);
      const summary = await this.overviewEmbed(amp, servers);
      const embeds = await this.individualEmbeds(amp, servers);

      /**
       * Order: Static plain-text message (posted once, outside of embeds),
       * then overview and individual dynamic embeds
       */
      embeds.unshift(summary);

      /**
       * Ensure static message stays at the top (older) and embeds at the bottom (newer)
       * If the static message is newer than existing embed messages, force a one-time recreation
       */
      try {
        const filePath = path.join(process.cwd(), "server information.txt");
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          const parsed = this.parseSilentDirective(content);
          const headerLine = parsed.headerLine;
          const fetched = await channel.messages.fetch({ limit: 100 });
          const msgs = Array.from(fetched.values());
          const staticMsg = msgs.find(
            (m) => !!m.content && m.content.trim().startsWith(headerLine),
          );
          const embedMsgs = msgs.filter((m) => m.embeds && m.embeds.length > 0);
          if (staticMsg && embedMsgs.length > 0) {
            const oldestEmbedTs = Math.min(
              ...embedMsgs.map((m) => m.createdTimestamp),
            );
            const staticIsNewerThanEmbeds =
              staticMsg.createdTimestamp > oldestEmbedTs;
            if (staticIsNewerThanEmbeds) {
              forceRecreateEmbeds = true;
            }
          }
        }
      } catch (_) {
        /** ignore detection errors; fall back to passed flag */
      }

      await this.updateEmbeds(
        embeds,
        channel,
        messageCache,
        forceRecreateEmbeds,
      );
    } catch (error) {
      logger.error("[ServersPanel] Error updating server status:", error);
    }
  }

  /**
   * Ensure the static plain-text server information.txt message exists and is up-to-date.
   * - If missing: post it and return { created: true, updated: false }
   * - If present and content differs: edit it in place and return { created: false, updated: true }
   * - Otherwise: return { created: false, updated: false }
   * Note: We purposefully do not touch embed messages here to preserve ordering.
   */
  private async ensureOrUpdateStaticInfo(
    channel: TextChannel,
  ): Promise<{ created: boolean; updated: boolean }> {
    try {
      const filePath = path.join(process.cwd(), "server information.txt");
      if (!fs.existsSync(filePath)) return { created: false, updated: false };

      const original = fs.readFileSync(filePath, "utf8");
      if (!original || original.trim().length === 0)
        return { created: false, updated: false };

      const { displayContent, headerLine, silent } =
        this.parseSilentDirective(original);
      const fetched = await channel.messages.fetch({ limit: 100 });
      const existingMessages = Array.from(fetched.values());

      const staticMsg = existingMessages.find(
        (m) => !!m.content && m.content.trim().startsWith(headerLine),
      );

      if (!staticMsg) {
        await channel.send({
          content: displayContent,
          allowedMentions: { parse: [] },
          flags: silent ? MessageFlags.SuppressNotifications : undefined,
        });
        return { created: true, updated: false };
      }

      /** Normalize both sides to avoid false positives due to CRLF vs LF differences */
      const fileNorm = this.normalizeContent(displayContent);
      const msgNorm = this.normalizeContent(staticMsg.content || "");
      if (msgNorm !== fileNorm) {
        await staticMsg.edit({
          content: displayContent,
          allowedMentions: { parse: [] },
        });
        return { created: false, updated: true };
      }

      return { created: false, updated: false };
    } catch (e) {
      logger.error(
        "[ServersPanel] Failed to ensure/update static server information.txt message:",
        e,
      );
      return { created: false, updated: false };
    }
  }

  /** Normalize content for reliable comparison across platforms and Discord formatting */
  private normalizeContent(s: string): string {
    return s.replace(/\r\n/g, "\n").trim();
  }

  /**
   * Parse leading @silent directive from the first line if present.
   * Returns the content to display (without the directive), whether it was silent, and the header line used to match the message.
   */
  private parseSilentDirective(content: string): {
    displayContent: string;
    silent: boolean;
    headerLine: string;
  } {
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) {
      return { displayContent: "", silent: false, headerLine: "" };
    }
    let first = lines[0] ?? "";
    let silent = false;
    const before = first;
    first = first.replace(/^@\s*silent\b[:\s-]*/i, (m) => {
      silent = true;
      return "";
    });
    if (silent && before !== first) {
      /** Trim leading spaces left after removing directive */
      first = first.replace(/^\s+/, "");
    }
    lines[0] = first;
    const displayContent = lines.join("\n");
    const headerLine = (first || "").trim();
    return { displayContent, silent, headerLine };
  }

  async overviewEmbed(amp: Amp, servers: Instance[]): Promise<EmbedBuilder> {
    /** Overview of pack and player count */
    let summary = new EmbedBuilder().setTitle("Server Status");
    let field: string = ``;
    let count = 0;

    for (const server of servers) {
      if (
        server.FriendlyName.includes(`ADS`) ||
        server.FriendlyName.includes(`Bot`) ||
        server.FriendlyName.includes(`Scheduler`) ||
        server.Suspended ||
        server.Hidden
      )
        continue;

      let players = await amp.getUserList(server.InstanceID);
      let currentPlayers = [];
      let regex = new RegExp(".*]");
      for (const player of players) {
        if (regex.test(player)) currentPlayers.push(player);
      }
      console.log(currentPlayers);
      players = players.filter((list) => regex.test(list));
      //const currentPlayers = server.Metrics?.[MetricKey.ActiveUsers]?.RawValue || 0;
      /** const currentPlayers = await this.messageFilter(await amp.getUpdates(server.InstanceID)); */
      const serverName = server.FriendlyName.replace(/\d\d\s/, "");
      count += currentPlayers.length;

      field = field.concat(
        `\`\`\`${serverName}: ${currentPlayers.length} players online\n\`\`\``,
      );
    }

    field = field.concat(`**__\`\`\`Total Players Online: ${count}\`\`\`__**`);
    summary.setColor(Colors.Blue);
    summary.setDescription(field).setTimestamp();

    return summary;
  }

  async messageFilter(message: string): Promise<number> {
    let time = new Date();
    const updates = JSON.parse(message); /** Get all updates for the instance */

    if (
      Array.isArray(updates.ConsoleEntries) &&
      updates.ConsoleEntries.length > 0
    ) {
      /** Filter console entries to only include those after the recorded time */
      const recentEntries = updates.ConsoleEntries.filter((entry: any) => {
        const entryDate = new Date(entry.Timestamp);
        return (
          entryDate.getTime() > time.getTime() - 9000
        ); /** Filter based on timestamp */
      });

      for (const entry of recentEntries) {
        const match = entry.Contents.match(
          /There are (\d+) of a max of (\d+) players online/i,
        );
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }

    return 0;
  }

  async individualEmbeds(amp: Amp, servers: Instance[]): Promise<EmbedBuilder[]> {
    /** Individual embeds */
    const minecraftInstances = await new Instances(amp).getMinecraftInstances();
    const hytaleInstances = await new Instances(amp).getHytaleInstances();
    let embeds: EmbedBuilder[] = [];

    for (const instance of minecraftInstances) {

      if(instance.Suspended)
        continue;

      let players = await amp.getUserList(instance.InstanceID);
      let currentPlayers = [];
      let regex = new RegExp(".*]");

      for (const player of players) {
        if (regex.test(player)) currentPlayers.push(player);
      }

      const isOnline = instance.AppState === AppState.Online;
      const embedColor = isOnline ? Colors.Green : Colors.Red;

      const status = isOnline ? "Online" : "Offline";

      let statusMessage;
      if (status === "Offline")
        statusMessage = ColorText.colorText(
          status,
          undefined,
          undefined,
          ColorText.enums.foreground.red,
        );
      else
        statusMessage = ColorText.colorText(
          status,
          undefined,
          undefined,
          ColorText.enums.foreground.green,
        );

      embeds.push(
        new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(`**${instance.FriendlyName.replace(/\d\d\s/, "")}**`)
          .addFields(
            {
              name: `__Version__`,
              value: `\`\`\`${instance.FTCVersion ? instance.FTCVersion : "N/A"}\`\`\``,
              inline: true,
            },
            {
              name: `__IP__`,
              value: `\`\`\`${instance.FTCIP ? instance.FTCIP.toUpperCase() : "N/A"}\`\`\``,
              inline: true,
            },
            {
              name: "\u200b",
              value: "\u200b",
              inline: false,
            },
            {
              name: `__Whitelist__`,
              value: `\`\`\`${instance.Whitelisted ? "True" : "False"}\`\`\``,
              inline: true,
            },
            {
              name: "__Status__",
              value: `\`\`\`${status}\`\`\``,
              inline: true,
            },
            {
              name: "__Players__",
              value: `\`\`\`\n${currentPlayers.length} of ${instance.Metrics?.[MetricKey.ActiveUsers]?.MaxValue || 0} online\n\`\`\``,
            },
          )
          .setTimestamp(),
      );

    }

    // TODO: Implement for Hytale servers later
    // for (const instance of hytaleInstances) {
    //
    // }

    return embeds;
  }

  async updateEmbeds(
    embeds: EmbedBuilder[],
    channel: TextChannel,
    messageCache: Map<string, string>,
    forceRecreate: boolean = false,
  ) {
    const embedChunks: EmbedBuilder[][] = [];
    for (let i = 0; i < embeds.length; i += 10) {
      embedChunks.push(embeds.slice(i, i + 10));
    }

    const fetched = await channel.messages.fetch({ limit: 100 });
    const existingMessages = Array.from(fetched.values());
    /** Work only with existing embed messages, leave any plain-text (like the static info) untouched */
    let existingEmbedMessages = existingMessages.filter(
      (m) => m.embeds && m.embeds.length > 0,
    );

    /** If forced recreation, delete existing embed messages so new ones are created after the static message */
    if (forceRecreate && existingEmbedMessages.length > 0) {
      for (const msg of existingEmbedMessages) {
        try {
          await msg.delete();
        } catch (_) {
          /** ignore individual delete errors */
        }
        messageCache.delete(msg.id);
      }
      existingEmbedMessages = [];
    }

    for (let i = 0; i < embedChunks.length; i++) {
      const newContent = JSON.stringify(
        embedChunks[i].map((embed) => embed.toJSON()),
      );

      if (existingEmbedMessages[i]) {
        const messageId = existingEmbedMessages[i].id;
        if (messageCache.get(messageId) !== newContent) {
          await existingEmbedMessages[i].edit({ embeds: embedChunks[i] });
          messageCache.set(messageId, newContent);
        }
      } else {
        const sentMessage = await channel.send({ embeds: embedChunks[i] });
        messageCache.set(sentMessage.id, newContent);
      }
    }

    for (let i = embedChunks.length; i < existingEmbedMessages.length; i++) {
      await existingEmbedMessages[i].delete();
      messageCache.delete(existingEmbedMessages[i].id);
    }
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}
