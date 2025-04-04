// Class to delete all messages in a given channel.

import {ChannelType, SlashCommandBuilder} from "discord.js";


module.exports = class DeleteAllMessages {
    static commandName = "discord_delete_all_messages";
    static description = "Delete all messages in a specified channel.";
    static subName = "channel";
    static subDescription = "Channel to delete messages from";

    CreateSlashCommand() {
        return new SlashCommandBuilder()
            .setName(DeleteAllMessages.commandName)
            .setDescription(DeleteAllMessages.description)
            .addChannelOption((option: any) => option
                .setName(DeleteAllMessages.subName)
                .setDescription(DeleteAllMessages.subDescription)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true));
    }

    CreateCommandFunctionality() {
        return async function execute(interaction: any) {
            try {
                await interaction.reply("🗑️ Deleting all messages...");

                const targetChannel = interaction.options.getChannel(DeleteAllMessages.subName);

                // Ensure the channel is valid and accessible
                if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
                    return await interaction.editReply("❌ Invalid channel provided.");
                }

                let deletedCount = 0;

                // Bulk delete messages within 14 days (up to 100 at a time)
                let messages;
                do {
                    messages = await targetChannel.messages.fetch({ limit: 100 });
                    const recentMessages = messages.filter(
                        (message: any) => Date.now() - message.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                    );

                    if (recentMessages.size > 0) {
                        await targetChannel.bulkDelete(recentMessages, true);
                        deletedCount += recentMessages.size;
                    }
                } while (messages.size === 100);

                // Delete older messages (beyond 14 days) in parallel
                const oldMessages = await targetChannel.messages.fetch({ limit: 100 });
                const oldMessageDeletions = oldMessages
                    .filter((message: any) => Date.now() - message.createdTimestamp >= 14 * 24 * 60 * 60 * 1000)
                    .map(async (message: any) => {
                        try {
                            await message.delete();
                            deletedCount++;
                        } catch (error) {
                            // @ts-ignore
                            console.warn(`Skipping message deletion due to error: ${error.message}`);
                        }
                    });

                await Promise.allSettled(oldMessageDeletions);

                await interaction.followUp(`✅ Successfully deleted ${deletedCount} messages.`);
            } catch (error) {
                // @ts-ignore
                console.error(`Error deleting messages: ${error.message}`);
                await interaction.followUp("❌ Failed to delete messages.");
            }
        };
    }

    async CreateObject() {
        return {
            data: this.CreateSlashCommand(),
            execute: this.CreateCommandFunctionality(),
        };
    }
};