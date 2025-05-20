import {
  ChannelType,
  ChatInputCommandInteraction,
  Message,
  SlashCommandBuilder,
  TextChannel,
} from 'discord.js';

export default class DeleteAllMessages {
  static commandName = 'discord_delete_all_messages';
  static description = 'Delete all messages in a specified channel.';
  static subName = 'channel';
  static subDescription = 'Channel to delete messages from';

  createSlashCommand() {
    return new SlashCommandBuilder()
      .setName(DeleteAllMessages.commandName)
      .setDescription(DeleteAllMessages.description)
      .addChannelOption((option) =>
        option
          .setName(DeleteAllMessages.subName)
          .setDescription(DeleteAllMessages.subDescription)
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      );
  }

  createCommandFunctionality() {
    return async function execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.reply('🗑️ Deleting all messages...');
        const targetChannel = interaction.options.getChannel(
          DeleteAllMessages.subName,
        ) as TextChannel | null;

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
          return await interaction.editReply('❌ Invalid channel provided.');
        }

        let deletedCount = 0;
        let messages;

        // Fetch and delete messages recursively
        do {
          messages = await targetChannel.messages.fetch({ limit: 100 });
          const recentMessages = messages.filter(
            (message: Message) =>
              Date.now() - message.createdTimestamp < 14 * 24 * 60 * 60 * 1000,
          );

          if (recentMessages.size > 0) {
            await targetChannel.bulkDelete(recentMessages, true);
            deletedCount += recentMessages.size;
          }
        } while (messages.size === 100);

        // Fetch old messages and delete them manually if older than 14 days
        const oldMessages = await targetChannel.messages.fetch({ limit: 100 });
        const oldMessageDeletions = oldMessages
          .filter(
            (message: Message) =>
              Date.now() - message.createdTimestamp >= 14 * 24 * 60 * 60 * 1000,
          )
          .map(async (message: Message) => {
            try {
              await message.delete();
              deletedCount++;
            } catch (error) {
              console.warn(
                `Skipping message deletion due to error: ${(error as Error).message}`,
              );
            }
          });

        await Promise.allSettled(oldMessageDeletions);

        await interaction.followUp(
          `✅ Successfully deleted ${deletedCount} messages.`,
        );
      } catch (error) {
        console.error(`Error deleting messages: ${(error as Error).message}`);
        await interaction.followUp('❌ Failed to delete messages.');
      }
    };
  }

  async createObject() {
    return {
      data: this.createSlashCommand(),
      execute: this.createCommandFunctionality(),
    };
  }
}
