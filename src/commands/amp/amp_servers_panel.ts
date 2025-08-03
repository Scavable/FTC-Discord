import {
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';
import Amp from '../../amp/Amp';
import Instance from '../../types/Instance';
import ColorText from '../../utility/ColorText';
import ServersFile from '../../utility/ServersFile';
import CustomClient from '../../CustomClient';

export default class ServersPanel {
  static enabled = true;
  static commandName = 'amp_servers_panel';
  static commandDescription = 'Display AMP server information';

  async createSlashCommand() {
    return new SlashCommandBuilder()
      .setName(ServersPanel.commandName)
      .setDescription(ServersPanel.commandDescription)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);
  }

  async createCommandFunctionality() {
    return async (interaction: ChatInputCommandInteraction) => {
      const client = interaction.client as CustomClient; // Cast to your custom client
      const guild = interaction.guild;

      if (!guild) {
        return await interaction.reply('❌ Guild not found.');
      }

      const guildState = client.guildState.get(guild.id);

      // If the panel is running, stop it
      if (guildState?.updateInterval) {
        clearInterval(guildState.updateInterval); // Stop the interval
        client.cleanupGuildState(guild.id); // Clean up the guild state
        return await interaction.reply('✅ Server status panel has been stopped.');
      }


      // Initialize guild state and AMP instance
      client.initializeGuildState(guild.id);
      const amp = client.getAmpInstance(guild.id);
      await amp.login();

      await interaction.deferReply();

      let channel: TextChannel = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildText && ch.name === 'server-status',
      ) as TextChannel;

      if (!channel) {
        channel = (await guild.channels.create({
          name: 'server-status',
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id, // @everyone role ID
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

      await interaction.editReply('✅ Server status panel started.');

      const messageCache = client.guildState.get(guild.id)?.messageCache!;
      const updateLoop = async () => {
        try {
          await this.updateServerStatus(amp, channel, messageCache);
        } catch (error) {
          console.error(
            `Error updating server status for guild ${guild.id}:`,
            error,
          );
        }
      };

      // Start the update loop
      // Run every 60 seconds
      client.guildState.get(guild.id)!.updateInterval = setInterval(
        updateLoop,
        60000,
      );

      // Run the first update immediately
      await updateLoop();
    };
  }

  private async updateServerStatus(
    amp: Amp,
    channel: TextChannel,
    messageCache: Map<string, string>,
  ) {
    try {
      const servers = await amp.readFile(await amp.getInstances());
      if (!servers) return;

      ServersFile.writeFile('servers.json', JSON.stringify(servers, null, 2));

      // Overview of pack and player count
      let summary = new EmbedBuilder().setTitle('Server Status');
      let field: string = ``;
      let color = true;

      for (const server of servers) {
        if (
          server.FriendlyName.includes(`ADS`) ||
          server.FriendlyName.includes(`Bot`) ||
          server.FriendlyName.includes(`Scheduler`) ||
          server.Suspended ||
          server.Hidden
        )
          continue;

        const currentPlayers = server.Metrics?.['Active Users']?.RawValue || 0;
        const serverName = server.FriendlyName.replace(/\d\d\s/, '');

        if (color) {
          field = field.concat(
            `\`\`\`ansi\n [32m${serverName}: ${currentPlayers} players online[0m\n\`\`\``,
          );
          color = false;
        } else {
          field = field.concat(
            `\`\`\`ansi\n [36m${serverName}: ${currentPlayers} players online[0m\n\`\`\``,
          );
          color = true;
        }
      }
      summary.setColor(Colors.Blue);
      summary.setDescription(field).setTimestamp();

      // Individual embeds
      const embeds = servers
        .filter(
          (info: Instance) =>
            !info.FriendlyName.includes('ADS') &&
            !info.FriendlyName.includes(`Scheduler`) &&
            !info.FriendlyName.includes(`Bot`) &&
            !info.Suspended &&
            !info.Hidden,
        )
        .map((info: Instance) => {
          const embedColor = info.AppState === 20 ? Colors.Green : Colors.Red;
          const status = info.AppState === 20 ? 'Online' : 'Offline';
          const currentPlayers = info.Metrics?.['Active Users']?.RawValue || 0;
          const maxPlayers = info.Metrics?.['Active Users']?.MaxValue || 0;
          const version = info.FTCVersion ? info.FTCVersion : 'N/A';
          const ip = info.FTCIP ? info.FTCIP.toUpperCase() : 'N/A';
          const isWhitelisted = info.Whitelisted ? 'True' : 'False';

          let statusMessage;
          if (status === 'Offline')
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

          return new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`**${info.FriendlyName.replace(/\d\d\s/, '')}**`)
            .addFields(
              {
                name: `__Version__`,
                value: `\`\`\`${version}\`\`\``,
                inline: true
              },
              {
                name: `__IP__`,
                value: `\`\`\`${ip}\`\`\``,
                inline: true
              },
              {
                name: '\u200b',
                value: '\u200b',
                inline: false,
              },
              {
                name: `__Whitelist__`,
                value: `\`\`\`${isWhitelisted}\`\`\``,
                inline: true
              },
              {
                name: '__Status__',
                value: `\`\`\`${statusMessage}\`\`\``,
                inline: true
              },
              {
                name: '__Players__',
                value: `\`\`\`\n${currentPlayers} of ${maxPlayers} online\n\`\`\``,
              },
            )
            .setTimestamp();
        });

      embeds.unshift(summary);

      const embedChunks: EmbedBuilder[][] = [];
      for (let i = 0; i < embeds.length; i += 10) {
        embedChunks.push(embeds.slice(i, i + 10));
      }

      const existingMessages = Array.from(
        (await channel.messages.fetch({ limit: 100 })).values(),
      );

      for (let i = 0; i < embedChunks.length; i++) {
        const newContent = JSON.stringify(
          embedChunks[i].map((embed) => embed.toJSON()),
        );

        if (existingMessages[i]) {
          const messageId = existingMessages[i].id;
          if (messageCache.get(messageId) !== newContent) {
            await existingMessages[i].edit({ embeds: embedChunks[i] });
            messageCache.set(messageId, newContent);
          }
        } else {
          const sentMessage = await channel.send({ embeds: embedChunks[i] });
          messageCache.set(sentMessage.id, newContent);
        }
      }

      for (let i = embedChunks.length; i < existingMessages.length; i++) {
        await existingMessages[i].delete();
        messageCache.delete(existingMessages[i].id);
      }
    } catch (error) {
      console.error('Error updating server status:', error);
    }
  }

  async createObject() {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}
