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
  private singleState: GuildState | null;
  disboardTimer: NodeJS.Timeout | null;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });
    this.commands = new Collection<string, CommandObject>();
    this.singleState = null;
    this.disboardTimer = null;
  }

  /**
   * Initialize the state for a specific guild.
   */
  async initializeGuildState(guildId: string): Promise<GuildState> {
    if (this.singleState) return this.singleState;

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

    this.singleState = state;
    return state;
  }

  /**
   * Get the state for a specific guild.
   */
  getGuildState(guildId: string): GuildState | undefined {
    void guildId; // parameter kept for API compatibility
    return this.singleState ?? undefined;
  }

  /**
   * Clean up the state for a specific guild.
   */
  cleanupGuildState(guildId: string) {
    void guildId; // parameter kept for API compatibility
    const state = this.singleState;
    if (state) {
      if (state.updateInterval) {
        clearInterval(state.updateInterval);
      }
      state.messageCache.clear();
      this.singleState = null;
    }
  }
}
