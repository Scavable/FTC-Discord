import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import logger from '../../utility/Logger';
import path from 'node:path';
import CustomClient from '../../CustomClient';

export default class ReloadAll {
  static commandName = 'discord_reload_all';
  static description = 'Reloads all commands';

  async createSlashCommand() {
    return new SlashCommandBuilder()
      .setName(ReloadAll.commandName)
      .setDescription(ReloadAll.description);
  }

  createCommandFunctionality() {
    return async function execute(interaction: ChatInputCommandInteraction) {
      try {
        await interaction.deferReply();
        let reloadCount = 0;
        const commandArray: any[] = Array.from(
          (interaction.client as CustomClient).commands.values(),
        );

        for (const command of commandArray) {
          if (command.data.name === 'discord_reload_all') continue;

          const commandName = command.data.name;

          // Node.js platform independent file handling
          const ext = import.meta.url.includes('.ts') ? 'ts' : 'js';
          const __fileName = import.meta.url.replace(
            `discord_reload_all`.concat(ext),
            ``,
          );
          const __dirname = path.dirname(__fileName);
          let commandPath = ``;

          // Determine paths of command files
          if (commandName.startsWith('amp')) {
            commandPath = path
              .join(__dirname, `../amp/${commandName}.`.concat(ext))
              .replace('.\\', '');
          } else if (commandName.startsWith('discord')) {
            commandPath = path
              .join(__dirname, `../discord/${commandName}.`.concat(ext))
              .replace('.\\', '');
          } else if (commandName.startsWith('minecraft')) {
            commandPath = path
              .join(__dirname, `../minecraft/${commandName}.`)
              .concat(ext)
              .replace('.\\', '');
          } else continue;

          try {
            // Dynamically import the command file and create a new instance of the command.
            // This is done to prevent the command from being cached.
            const { default: NewCommand } = await import(commandPath);
            const newCommandInstance = new NewCommand();
            const newCommandObject = await newCommandInstance.createObject();

            if (!newCommandObject?.data?.name || !newCommandObject?.execute) {
              throw new Error(`Invalid command structure: ${commandName}`);
            }

            (interaction.client as CustomClient).commands.set(
              newCommandObject.data.name,
              newCommandObject,
            );

            logger.info(`✅ Reloaded command: ${newCommandObject.data.name}`);
            reloadCount++;
          } catch (error: any) {
            console.error(`❌ Error reloading command ${commandName}:`, error);
            await interaction.followUp(
              `❌ Failed to reload \`${commandName}\`: ${error.message}`,
            );
          }
        }

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
