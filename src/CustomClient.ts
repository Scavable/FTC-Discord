import { Client, Collection, GatewayIntentBits } from 'discord.js';
import Amp from './amp/Amp';
import { config } from './Config';

export default class CustomClient extends Client {
  commands: Collection<string, any>;
  guildState: Map<
    string,
    {
      amp: Amp | null;
      messageCache: Map<string, any>;
      updateInterval: NodeJS.Timeout | null
    }
  >;

  constructor() {
    super({ intents: [GatewayIntentBits.Guilds] });
    this.commands = new Collection<string, any>();
    this.guildState = new Map();
  }

  /**
   * Initialize the state for a guild and create a new Amp instance.
   * @param guildId - The ID of the guild.
   */
  initializeGuildState(guildId: string) {
    if (!this.guildState.has(guildId)) {
      // Provide specific AMP credentials for each guild if needed
      const amp = new Amp(config.AMP_USERNAME, config.AMP_PASS, '', false);
      this.guildState.set(guildId, { amp, messageCache: new Map(), updateInterval: null });
    }
  }

  /**
   * Get the Amp instance for a guild. Initializes the guild state if it doesn't exist.
   */
  getAmpInstance(guildId: string): Amp {
    if (!this.guildState.has(guildId)) {
      this.initializeGuildState(guildId);
    }
    return this.guildState.get(guildId)!.amp!;
  }

  /**
   * Clean up the state for a guild.
   * @param guildId - The ID of the guild.
   */
  cleanupGuildState(guildId: string) {
    if (this.guildState.has(guildId)) {
      const { updateInterval } = this.guildState.get(guildId)!;

      // If an update loop exists, clear it
      if (updateInterval) {
        clearInterval(updateInterval);
      }

      // Remove the guild state entry
      this.guildState.delete(guildId);
    }
  }
}
