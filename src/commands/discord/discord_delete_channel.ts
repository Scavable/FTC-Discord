import {ChannelType, PermissionFlagsBits, Role, SlashCommandBuilder} from "discord.js";
import {CategoryChannel, GuildChannel} from "discord.js";

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
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels); // Restrict command to users with Manage Channels permission
    }

    createCommandFunctionality() {
        return async (interaction: any) => {
            const guild = interaction.guild;
            if (!guild) {
                return await interaction.reply("❌ Guild not found.");
            }

            const member = interaction.member;
            const targetChannel = interaction.options.getChannel("channel");

            // Restrict command to users with the "staff" role
            if (!member?.roles.cache.some((role: Role) => role.name === 'staff')) {
                return await interaction.reply("❌ You do not have the required role to run this command.");
            }

            if (!targetChannel) {
                return await interaction.reply("❌ You must provide a valid channel or category.");
            }

            await interaction.deferReply();

            try {
                // Check if the target is a category
                if (targetChannel.type === ChannelType.GuildCategory) {
                    const category = targetChannel as CategoryChannel;
                    const childChannels = guild.channels.cache.filter(c => c.parentId === category.id);

                    // Delete all child channels first
                    for (const [_, channel] of childChannels) {
                        await channel.delete(`Deleted by ${interaction.user.tag}`);
                    }

                    // Then delete the category itself
                    await category.delete(`Deleted by ${interaction.user.tag}`);

                    await interaction.editReply(`✅ Category **${targetChannel.name}** and all its channels have been deleted.`);
                } else {
                    // Delete a single channel
                    await targetChannel.delete(`Deleted by ${interaction.user.tag}`);
                    await interaction.editReply(`✅ Channel **${targetChannel.name}** has been deleted.`);
                }
            } catch (error) {
                console.error("Error deleting channel(s):", error);
                await interaction.editReply("❌ There was an error deleting the channel(s).");
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
