import {
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
import Logger from '../../utility/Logger';

export default class DeleteChannelCommand {
  enabled: boolean = false;
  static commandName: string = 'delete_channel';
  static commandDescription: string =
    'Delete a category with child channels or a single channel';

  async createSlashCommand() {
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

  createCommandFunctionality() {
    return async (interaction: ChatInputCommandInteraction) => {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: '❌ Guild context required.', flags: [MessageFlags.Ephemeral] });
      }

      const guild = interaction.guild!;
      const member = interaction.member as GuildMember;
      const targetChannel = interaction.options.getChannel('channel', true);

      // Optional: extra member permission guard (beyond default member permissions)
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ Missing Manage Channels permission.', flags: [MessageFlags.Ephemeral] });
      }

      const me = guild.members.me;
      if (!me || !me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: "❌ I don't have permission to manage channels.", flags: [MessageFlags.Ephemeral] });
      }

      await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

      try {
        if (targetChannel instanceof CategoryChannel) {
          const allChannels = await guild.channels.fetch();
          const childChannels = allChannels.filter(c => c?.parentId === targetChannel.id) as Collection<string, GuildChannel>;

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
            return interaction.editReply(`❌ Cannot delete category ${targetChannel.name} due to permissions.`);
          }

          await targetChannel.delete(`Deleted by ${interaction.user.tag}`);

          const baseMsg = `✅ Category **${targetChannel.name}** and its channels have been deleted.`;
          return interaction.editReply(
            failures.length ? `${baseMsg} However, could not delete: ${failures.join(', ')}` : baseMsg
          );
        }

        if ('deletable' in targetChannel && (targetChannel as any).deletable) {
          await (targetChannel as any).delete(`Deleted by ${interaction.user.tag}`);
          return interaction.editReply(`✅ Deleted <#${targetChannel.id}>.`);
        }

        return interaction.editReply('❌ This type of channel cannot be deleted.');
      } catch (error) {

        Logger.error(`Error deleting channel(s): ${error}`, e);
        return interaction.editReply('❌ An unexpected error occurred while deleting.');
      }
    };
  }

  async createObject() {
    return {
      data: await this.createSlashCommand(),
      execute: this.createCommandFunctionality(),
    };
  }
}
