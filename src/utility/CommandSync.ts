import { ApplicationCommand, REST, Routes } from 'discord.js';
import { config } from '../Config';
import CommandLoader from './CommandLoader';
import CustomClient from '../CustomClient';
import logger from './Logger'; // Import the custom client

export default class CommandSync {
  client: CustomClient; // Use the custom client
  rest: REST;

  constructor(client: CustomClient) {
    this.client = client;
    this.rest = new REST().setToken(config.DISCORD_TOKEN);
  }

  async syncGuildCommands(forceUpdate = false) {
    try {
      const guildCommands: Array<ApplicationCommand> = (await this.rest.get(
        Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      )) as Array<ApplicationCommand>;

      if (this.isCommandUpdateNeeded(guildCommands) || forceUpdate) {
        logger.info('Updating guild commands...');
        this.client.commands.clear();
        await new CommandLoader(this.client).loadCommands();

        let commandArray = [];
        for (const temp of this.client.commands) {
          commandArray.push(temp[1].data.toJSON());
        }

        // Logging the command names or other useful information
        commandArray.forEach((command) => {
          logger.info(`Command: ${command.name}`);
        });

        // Sync the commands to the Discord API
        await this.rest.put(
          Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
          {
            body: commandArray,
          },
        );

        logger.commands(
          `Successfully registered ${this.client.commands.size} commands.`,
        );
      } else {
        logger.commands('No command updates required.');
      }
    } catch (error) {
      logger.error(`Error syncing guild commands: ${error}`);
    }
  }

  isCommandUpdateNeeded(guildCommands: Array<ApplicationCommand>) {
    if (guildCommands.length !== this.client.commands.size) return true;
    for (const guildCommand of guildCommands) {
      if (!this.client.commands.has(guildCommand.name)) {
        return true;
      }
    }
    return false;
  }
}
