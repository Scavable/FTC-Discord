import { ChatInputCommandInteraction, Events } from 'discord.js';
import CustomClient from '../CustomClient';
import { config } from '../Config';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.isChatInputCommand()) return;

    // Restrict the bot to a single configured guild only
    if (!interaction.guildId || interaction.guildId !== config.GUILD_ID) {
      try {
        await interaction.reply({
          content: 'This bot is restricted to a specific server and cannot be used here.',
          ephemeral: true,
        });
      } catch (_) {
        // ignore reply errors (e.g., already replied)
      }
      return;
    }

    let customClient = interaction.client as CustomClient;

    const command = customClient.commands.get(interaction.commandName);

    if (!command) {
      console.error(
        `No command matching ${interaction.commandName} was found.`,
      );
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const reply = {
        content: 'There was an error while executing this command!',
        ephemeral: true,
      };
      interaction.replied || interaction.deferred
        ? await interaction.followUp(reply)
        : await interaction.reply(reply);
    }
  },
};
