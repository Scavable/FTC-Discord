import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import RoleMapper from '../../utility/RoleMapper.js';
import type { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand.js';

export default class CreateCategoryCommand implements BaseCommand {
  static commandName: string = 'create_category';
  static commandDescription: string = 'Create a category with child channels';

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(CreateCategoryCommand.commandName)
      .setDescription(CreateCategoryCommand.commandDescription)
      .addStringOption((option) =>
        option
          .setName('category_name')
          .setDescription('Name of the category to create')
          .setRequired(true),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels); /** Restrict command to users with Manage Channels permission */
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();

      const guild = interaction.guild;
      if (!guild) {
        return await interaction.editReply('❌ Guild not found.');
      }
      const roleMapper = new RoleMapper(guild);
      await roleMapper.initialize();

      const member = interaction.member;
      const categoryName = interaction.options.getString('category_name');

      const staffRoleId = roleMapper.getRoleId('Staff');
      const rulesRoleId = roleMapper.getRoleId('Rules');

      if (!staffRoleId || !rulesRoleId) {
        return await interaction.editReply(
          '❌ Could not find required roles (Staff/Rules). Please ensure they exist.',
        );
      }

      /** Restrict command to users with the "staff" role */
      if (!member || (Array.isArray(member.roles) ? !member.roles.includes(staffRoleId) : !member.roles.cache.has(staffRoleId))) {
        return await interaction.editReply(
          '❌ You do not have the required role to run this command.',
        );
      }

      if (!categoryName) {
        return await interaction.editReply(
          '❌ You must provide a category name.',
        );
      }

      try {
        /** Create the category channel with permissions */
        const category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory,
          position: 0,
          permissionOverwrites: [
            {
              id: guild.id, /** @everyone role ID */
              deny: [
                PermissionFlagsBits.ViewChannel,
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
            {
              id: staffRoleId,
              allow: [
                PermissionFlagsBits.MentionEveryone,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.ManageThreads,
                PermissionFlagsBits.SendPolls,
                PermissionFlagsBits.MuteMembers,
                PermissionFlagsBits.DeafenMembers,
                PermissionFlagsBits.MoveMembers,
                PermissionFlagsBits.CreateEvents,
                PermissionFlagsBits.ManageEvents,
              ],
            },
            {
              id: rulesRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.SendMessagesInThreads,
                PermissionFlagsBits.CreatePublicThreads,
                PermissionFlagsBits.CreatePrivateThreads,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.UseExternalStickers,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.UseEmbeddedActivities,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak,
                PermissionFlagsBits.Stream,
                PermissionFlagsBits.UseSoundboard,
                PermissionFlagsBits.UseExternalSounds,
                PermissionFlagsBits.UseVAD,
              ],
            },
          ],
        });

        /** Prepend the category name to the child channel names */
        const announcementName = `${categoryName}-announcements`;
        const generalChatName = `${categoryName}-general-chat`;
        const supportChatName = `${categoryName}-support-chat`;
        const voiceChannelName = `${categoryName}-voice-channel`;

        /** Create the announcement channel */
        await guild.channels.create({
          name: announcementName,
          type: ChannelType.GuildAnnouncement,
          parent: category.id,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageWebhooks,
                PermissionFlagsBits.CreateInstantInvite,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.SendMessagesInThreads,
                PermissionFlagsBits.CreatePublicThreads,
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
                PermissionFlagsBits.UseApplicationCommands,
                PermissionFlagsBits.UseEmbeddedActivities,
                PermissionFlagsBits.UseExternalApps,
              ],
            },
            {
              id: rulesRoleId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.AddReactions,
                PermissionFlagsBits.UseExternalEmojis,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            },
          ],
        });

        /** Create two text channels */
        await guild.channels.create({
          name: generalChatName,
          type: ChannelType.GuildText,
          parent: category.id,
        });

        await guild.channels.create({
          name: supportChatName,
          type: ChannelType.GuildText,
          parent: category.id,
        });

        /** Create a voice channel */
        await guild.channels.create({
          name: voiceChannelName,
          type: ChannelType.GuildVoice,
          parent: category.id,
          /** bitrate: 64000, */ /** Default bitrate for voice channel */
          /** userLimit: 10, */ /** Limit the number of users in the voice channel */
        });

        /** Respond with success message */
        await interaction.editReply(
          `✅ Category **${categoryName}** created successfully with child channels!`,
        );
      } catch (error) {
        console.error('Error creating category or channels:', error);
        await interaction.editReply(
          '❌ There was an error creating the category and channels.',
        );
      }
    };
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}
