import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import logger from '../../utility/Logger';
import CustomClient from '../../CustomClient';
import Commands from '../../utility/Commands';
import { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand';

export default class ReloadAll implements BaseCommand {
  enabled: boolean = true;
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
        client.commands.clear();
        await new Commands(client).updateGuildCommands();

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
