import AmpServersPanelCommand from '../commands/amp/amp_servers_panel';
import CreateCategoryCommand from '../commands/discord/discord_create_category';
import DeleteAllMessagesCommand from '../commands/discord/discord_delete_all_messages';
import DeleteChannelCommand from '../commands/discord/discord_delete_channel';
import ReloadAllCommand from '../commands/discord/discord_reload_all';
import WhitelistCommand from '../commands/minecraft/minecraft_whitelist';

const CommandRegistry = {
  async getCommands() {
    return [
      await new AmpServersPanelCommand().createObject(),
      await new CreateCategoryCommand().createObject(),
      await new DeleteAllMessagesCommand().createObject(),
      await new DeleteChannelCommand().createObject(),
      await new ReloadAllCommand().createObject(),
      await new WhitelistCommand().createObject(),
    ];
  },
};

export default CommandRegistry;
