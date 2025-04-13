import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { TextChannel, VoiceChannel, CategoryChannel, Guild } from "discord.js"; // Import necessary types

export default class CreateCategoryCommand {
    static commandName = "create_category";
    static commandDescription = "Create a category with child channels";

    async createSlashCommand() {
        return new SlashCommandBuilder()
            .setName(CreateCategoryCommand.commandName)
            .setDescription(CreateCategoryCommand.commandDescription)
            .addStringOption(option =>
                option.setName("category_name")
                    .setDescription("Name of the category to create")
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels); // Restrict command to users with Manage Channels permission
    }

    createCommandFunctionality() {
        return async (interaction: any) => {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply("❌ Guild not found.");
            }

            const member = interaction.member;
            const categoryName = interaction.options.getString("category_name");

            // // Restrict command to users with the "staff" role
            // if (!member?.roles.cache.some(role => role.name === 'staff')) {
            //     return await interaction.reply("❌ You do not have the required role to run this command.");
            // }

            if (!categoryName) {
                return await interaction.reply("❌ You must provide a category name.");
            }

            await interaction.deferReply();

            try {
                // Create the category channel
                const category = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    position: 0, // Position in the category list
                }) as CategoryChannel;

                // Prepend the category name to the child channel names
                const announcementName = `${categoryName} Announcements`;
                const generalChatName = `${categoryName} General Chat`;
                const supportChatName = `${categoryName} Support Chat`;
                const voiceChannelName = `${categoryName} Voice Channel`;

                // Create the announcement channel
                const announcementsChannel = await guild.channels.create({
                    name: announcementName,
                    type: ChannelType.GuildAnnouncement,
                    parent: category.id,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.AddReactions,
                                PermissionFlagsBits.AttachFiles,
                                PermissionFlagsBits.ReadMessageHistory,
                                PermissionFlagsBits.ManageMessages,
                                PermissionFlagsBits.MentionEveryone,
                                PermissionFlagsBits.CreatePublicThreads,
                                PermissionFlagsBits.CreatePrivateThreads,
                                PermissionFlagsBits.UseExternalEmojis,
                                PermissionFlagsBits.UseExternalStickers,
                            ], // Deny all common permissions for @everyone
                        },
                        // {
                        //     id: guild.roles.cache.find(role => role.name === 'Rules')?.id || '', // Find the Rules role
                        //     allow: [PermissionFlagsBits.AddReactions], // Allow add reactions permission for Rules role
                        // },
                    ],
                });

                // Create two text channels
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

                // Create a voice channel
                await guild.channels.create({
                    name: voiceChannelName,
                    type: ChannelType.GuildVoice,
                    parent: category.id,
                    bitrate: 64000, // Default bitrate for voice channel
                    userLimit: 10, // Limit the number of users in the voice channel
                });

                // Respond with success message
                await interaction.editReply(`✅ Category **${categoryName}** created successfully with child channels!`);
            } catch (error) {
                console.error("Error creating category or channels:", error);
                await interaction.editReply("❌ There was an error creating the category and channels.");
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
