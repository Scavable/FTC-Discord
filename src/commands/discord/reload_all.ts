import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import logger from '../../utility/Logger.js';
import CustomClient from '../../CustomClient.js';
import Commands from '../../utility/Commands.js';
import type { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand.js';

export default class ReloadAll implements BaseCommand {
  static commandName: string = 'reload_all';
  static description: string = 'Reloads all commands';

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(ReloadAll.commandName)
      .setDescription(ReloadAll.description);
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async function execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();

        const client = interaction.client as CustomClient;

        /** Clear existing commands and reload from the CommandRegistry via CommandLoader */
        if (!interaction.guildId) return interaction.followUp('Guild not found.');
        await new Commands(client).updateGuildCommands(interaction.guildId);

        const reloadCount = client.commands.size;
        logger.info(`✅ Reloaded ${reloadCount} commands via Commands class.`);

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

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}

