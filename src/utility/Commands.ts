import CustomClient from '../CustomClient';
import CreateCategoryCommand from '../commands/discord/create_category';
import DeleteChannelCommand from '../commands/discord/delete_channel';
import ReloadAllCommand from '../commands/discord/reload_all';
import WhitelistCommand from '../commands/minecraft/whitelist';
import CommandButtons from '../commands/discord/command_buttons';
import { REST, Routes } from 'discord.js';
import { config } from '../Config';
import logger from './Logger';
import ServerInformationCommand from '../commands/amp/servers_panel';

class Commands {
  private client: CustomClient;
  private rest: REST;
  private readonly commands: Array<any>;

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
    ];
  }

  async updateGuildCommands() {
    this.client.commands.clear();

    let commandsArray: any[] = [];
    for(const command of this.commands) {
      if(command.enabled){
        const commandObject = await command.createObject();
        commandsArray.push(commandObject.data.toJSON());
        if ('data' in commandObject && 'execute' in commandObject) {
          this.client.commands.set(commandObject.data.name, commandObject);
          logger.commands(`Loaded command: ${commandObject.data.name}`);
        } else {
          console.warn(`[WARNING] Command is missing required properties.`);
        }
      }
    }
    await this.rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      {
        body: commandsArray,
      },
    );
  }


}export default Commands;
