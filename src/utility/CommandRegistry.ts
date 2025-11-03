import AmpServersPanelCommand from '../commands/amp/servers_panel';
import CreateCategoryCommand from '../commands/discord/create_category';
import DeleteChannelCommand from '../commands/discord/delete_channel';
import ReloadAllCommand from '../commands/discord/reload_all';
import WhitelistCommand from '../commands/minecraft/whitelist';

const CommandRegistry = {
   getCommands() {
    return [
      new AmpServersPanelCommand(),
      new CreateCategoryCommand(),
      new DeleteChannelCommand(),
      new ReloadAllCommand(),
      new WhitelistCommand(),
    ];
  },
};

export default CommandRegistry;
