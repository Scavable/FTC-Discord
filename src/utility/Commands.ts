import CustomClient from '../CustomClient';
import CreateCategoryCommand from '../commands/discord/create_category';
import DeleteChannelCommand from '../commands/discord/delete_channel';
import ReloadAllCommand from '../commands/discord/reload_all';
import WhitelistCommand from '../commands/minecraft/whitelist';
import CommandButtons from '../commands/discord/command_buttons';
import RankCommand from '../commands/minecraft/rank';
import { REST, Routes } from 'discord.js';
import { config } from '../Config';
import logger from './Logger';
import ServerInformationCommand from '../commands/amp/server_information';
import { BaseCommand, CommandObject } from '../interface/BaseCommand';

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
      new CommandButtons(),
      new RankCommand(),
    ];
  }

  async updateGuildCommands(guildId: string) {
    const commandsArray: any[] = [];
    
    await Promise.all(this.commands.map(async (command) => {
      if (command.enabled) {
        const commandObject: CommandObject = await command.createObject();
        commandsArray.push(commandObject.data.toJSON());
        this.client.commands.set(commandObject.data.name, commandObject);
        logger.commands(`Loaded command: ${commandObject.data.name} for guild ${guildId}`);
      }
    }));

    await this.rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, guildId),
      {
        body: commandsArray,
      },
    );
  }


}export default Commands;
