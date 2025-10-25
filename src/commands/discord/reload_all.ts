import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import logger from '../../utility/Logger';
import CustomClient from '../../CustomClient';
import CommandLoader from '../../utility/CommandLoader';
import CommandSync from '../../utility/CommandSync';

export default class ReloadAll {
  enabled: boolean = true;
  static commandName: string = 'reload_all';
  static description: string = 'Reloads all commands';

  async createSlashCommand() {
    return new SlashCommandBuilder()
      .setName(ReloadAll.commandName)
      .setDescription(ReloadAll.description);
  }

  createCommandFunctionality() {
    return async function execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        const client = interaction.client as CustomClient;

        // Clear existing commands and reload from the CommandRegistry via CommandLoader
        client.commands.clear();
        await new CommandLoader(client).loadCommands();

        // Force sync commands to Discord
        await new CommandSync(client).syncGuildCommands(true);

        const reloadCount = client.commands.size;
        logger.info(`✅ Reloaded ${reloadCount} commands via CommandLoader.`);

        await interaction.followUp(
          `✅ Successfully reloaded ${reloadCount} commands.`,
        );
      } catch (error) {
        console.error('Error in reload_all command:', error);
        await interaction.followUp(
          '❌ An error occurred while reloading commands.',
        );
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
