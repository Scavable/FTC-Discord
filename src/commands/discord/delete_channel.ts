import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  CategoryChannel,
  GuildChannel,
  ChatInputCommandInteraction,
  Collection,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import Logger from '../../utility/Logger.js';
import type { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand.js';

export default class DeleteChannelCommand implements BaseCommand {
  static commandName: string = 'delete_channel';
  static commandDescription: string =
    'Delete a category with child channels or a single channel';

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(DeleteChannelCommand.commandName)
      .setDescription(DeleteChannelCommand.commandDescription)
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('The channel or category to delete')
          .addChannelTypes(
            ChannelType.GuildCategory,
            ChannelType.GuildText,
          )
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.inGuild()) {
        return interaction.reply({
          content: '❌ Guild context required.',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const guild = interaction.guild!;
      const member = interaction.member as GuildMember;
      const targetChannel = interaction.options.getChannel('channel', true);

      /** Permission checks */
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: '❌ Missing Manage Channels permission.',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const me = guild.members.me;
      if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: "❌ I don't have permission to manage channels.",
          flags: [MessageFlags.Ephemeral],
        });
      }

      const confirm = new ButtonBuilder()
        .setCustomId('confirm_delete')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Success);

      const cancel = new ButtonBuilder()
        .setCustomId('cancel_delete')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm, cancel);

      const response = await interaction.reply({
        content: `Are you sure you want to delete ${
          targetChannel instanceof CategoryChannel ? 'category' : 'channel'
        } **${targetChannel.name}**?`,
        components: [row],
        flags: [MessageFlags.Ephemeral],
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30_000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'cancel_delete') {
          await i.update({
            content: '❌ Deletion cancelled.',
            components: [],
          });
          return collector.stop();
        }

        if (i.customId === 'confirm_delete') {
          await i.update({
            content: 'Deleting channel(s)...',
            components: [],
          });

          try {
            if (targetChannel instanceof CategoryChannel) {
              const allChannels = await guild.channels.fetch();
              const childChannels = allChannels.filter(
                (c) => c?.parentId === targetChannel.id
              ) as Collection<string, GuildChannel>;

              const failures: string[] = [];
              for (const channel of childChannels.values()) {
                if (!('deletable' in channel) || !channel.deletable) {
                  failures.push(`#${channel.name}`);
                  continue;
                }
                try {
                  await channel.delete(`Deleted by ${interaction.user.tag}`);
                } catch {
                  failures.push(`#${channel.name}`);
                }
              }

              if (!targetChannel.deletable) {
                return i.editReply(
                  `❌ Cannot delete category **${targetChannel.name}** due to permissions.`
                );
              }

              await targetChannel.delete(`Deleted by ${interaction.user.tag}`);

              const baseMsg = `✅ Category **${targetChannel.name}** and its channels have been deleted.`;
              await i.editReply(
                failures.length
                  ? `${baseMsg} However, could not delete: ${failures.join(', ')}`
                  : baseMsg
              );
            } else if ('deletable' in targetChannel && (targetChannel as any).deletable) {
              await (targetChannel as any).delete(`Deleted by ${interaction.user.tag}`);
              await i.editReply(`✅ Deleted **${targetChannel.name}**.`);
            } else {
              await i.editReply('❌ This type of channel cannot be deleted.');
            }
          } catch (error) {
            Logger.error(`Error deleting channel(s): ${error}`);
            await i.editReply('❌ An unexpected error occurred while deleting.');
          } finally {
            collector.stop();
          }
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
          await interaction.editReply({
            content: '❌ Deletion timed out.',
            components: [],
          });
        }
      });
    };
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}

