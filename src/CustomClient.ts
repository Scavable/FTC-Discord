import { Client, Collection, GatewayIntentBits } from 'discord.js';
import Amp from './amp/ads/Amp.js';
import { config } from './Config.js';
import type { CommandObject } from './interface/BaseCommand.js';
import Servers from './utility/Servers.js';
import RoleMapper from './utility/RoleMapper.js';

export interface GuildState {
  amp: Amp;
  servers: Servers;
  roleMapper: RoleMapper;
  messageCache: Map<string, any>;
  updateInterval: NodeJS.Timeout | null;
}

export default class CustomClient extends Client {
  commands: Collection<string, CommandObject>;
  private guildStates: Map<string, GuildState>;
  disboardTimer: NodeJS.Timeout | null;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });
    this.commands = new Collection<string, CommandObject>();
    this.guildStates = new Map();
    this.disboardTimer = null;
  }

  /**
   * Initialize the state for a specific guild.
   */
  async initializeGuildState(guildId: string): Promise<GuildState> {
    if (this.guildStates.has(guildId)) {
      return this.guildStates.get(guildId)!;
    }

    const guild = await this.guilds.fetch(guildId);
    if (!guild) {
      throw new Error(`Guild ${guildId} not found.`);
    }

    const amp = new Amp(config.AMP_USERNAME, config.AMP_PASS, '', false);
    const servers = new Servers();
    const roleMapper = new RoleMapper(guild);
    await roleMapper.initialize();

    const state: GuildState = {
      amp,
      servers,
      roleMapper,
      messageCache: new Map(),
      updateInterval: null,
    };

    this.guildStates.set(guildId, state);
    return state;
  }

  /**
   * Get the state for a specific guild.
   */
  getGuildState(guildId: string): GuildState | undefined {
    return this.guildStates.get(guildId);
  }

  /**
   * Clean up the state for a specific guild.
   */
  cleanupGuildState(guildId: string) {
    const state = this.guildStates.get(guildId);
    if (state) {
      if (state.updateInterval) {
        clearInterval(state.updateInterval);
      }
      state.messageCache.clear();
      this.guildStates.delete(guildId);
    }
  }
}
