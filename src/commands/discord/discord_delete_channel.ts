import {
    ChannelType,
    PermissionFlagsBits,
    Role,
    SlashCommandBuilder,
    CategoryChannel,
    GuildChannel,
    ChatInputCommandInteraction,
    GuildBasedChannel
} from "discord.js";

export default class DeleteChannelCommand {
    static commandName = "discord_delete_channel";
    static commandDescription = "Delete a category with child channels or a single channel";

    async createSlashCommand() {
        return new SlashCommandBuilder()
            .setName(DeleteChannelCommand.commandName)
            .setDescription(DeleteChannelCommand.commandDescription)
            .addChannelOption(option =>
                option.setName("channel")
                    .setDescription("The channel or category to delete")
                    .setRequired(true))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
    }

    createCommandFunctionality() {
        return async (interaction: ChatInputCommandInteraction) => {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply("❌ Guild not found.");
            }

            const member = interaction.member;
            const targetChannel = interaction.options.getChannel("channel") as GuildBasedChannel;

            // Check if member exists and has the staff role
            if (!member || !('roles' in member) || !member.roles.cache.some((role: Role) => role.name === 'staff')) {
                return await interaction.reply({
                    content: "❌ You do not have the required role to run this command.",
                    ephemeral: true
                });
            }

            if (!targetChannel) {
                return await interaction.reply({
                    content: "❌ You must provide a valid channel or category.",
                    ephemeral: true
                });
            }

            // Check bot permissions
            const botMember = guild.members.cache.get(interaction.client.user.id);
            if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.reply({
                    content: "❌ I don't have permission to manage channels.",
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            try {
                // Check if the target is a category
                if (targetChannel.type === ChannelType.GuildCategory) {
                    const category = targetChannel as CategoryChannel;
                    const childChannels = guild.channels.cache.filter(c => c.parentId === category.id);

                    // Delete all child channels first
                    for (const channel of childChannels.values()) {
                        if (channel.deletable) {
                            await channel.delete(`Deleted by ${interaction.user.tag}`);
                        } else {
                            await interaction.editReply(`⚠️ Cannot delete channel ${channel.name} due to permissions.`);
                            return;
                        }
                    }

                    // Then delete the category itself
                    if (category.deletable) {
                        await category.delete(`Deleted by ${interaction.user.tag}`);
                        await interaction.editReply(`✅ Category **${targetChannel.name}** and all its channels have been deleted.`);
                    } else {
                        await interaction.editReply(`❌ Cannot delete category ${category.name} due to permissions.`);
                    }
                } else if ('deletable' in targetChannel) {
                    // Delete a single channel
                    if (targetChannel.deletable) {
                        await targetChannel.delete(`Deleted by ${interaction.user.tag}`);
                        await interaction.editReply(`✅ Channel **${targetChannel.name}** has been deleted.`);
                    } else {
                        await interaction.editReply(`❌ Cannot delete channel ${targetChannel.name} due to permissions.`);
                    }
                } else {
                    await interaction.editReply("❌ This type of channel cannot be deleted.");
                }
            } catch (error) {
                console.error("Error deleting channel(s):", error);
                await interaction.editReply(`❌ Error while deleting: ${error instanceof Error ? error.message : 'Unknown error'}`);
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