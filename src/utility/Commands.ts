import CustomClient from '../CustomClient.js';
import CreateCategoryCommand from '../commands/discord/create_category.js';
import DeleteChannelCommand from '../commands/discord/delete_channel.js';
import ReloadAllCommand from '../commands/discord/reload_all.js';
import WhitelistCommand from '../commands/minecraft/whitelist.js';
import RankCommand from '../commands/minecraft/rank.js';
import { REST, Routes } from 'discord.js';
import { config } from '../Config.js';
import logger from './Logger.js';
import ServerInformationCommand from '../commands/amp/server_information.js';
import type { BaseCommand, CommandObject } from '../interface/BaseCommand.js';

class Commands {
  private client: CustomClient;
  private rest: REST;
  private readonly commands: Array<BaseCommand>;

  constructor(client: CustomClient) {
    this.client = client;
    this.rest = new REST().setToken(config.DISCORD_TOKEN);
    this.commands = [
      new ServerInformationCommand(),
      new CreateCategoryCommand(),
      new DeleteChannelCommand(),
      new ReloadAllCommand(),
      new WhitelistCommand(),
      new RankCommand(),
    ];
  }

  async updateGuildCommands(guildId: string) {
    const commandsArray: any[] = [];
    
    await Promise.all(this.commands.map(async (command) => {
      const commandObject: CommandObject = await command.createObject();
      const commandName = commandObject.data.name;

      if (config.DISABLED_COMMANDS.includes(commandName)) {
        logger.commands(`Skipping disabled command: ${commandName} for guild ${guildId}`);
        return;
      }

      commandsArray.push(commandObject.data.toJSON());
      this.client.commands.set(commandName, commandObject);
      logger.commands(`Loaded command: ${commandName} for guild ${guildId}`);
    }));

    await this.rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, guildId),
      {
        body: commandsArray,
      },
    );
  }


}export default Commands;

