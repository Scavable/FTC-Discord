import { Client, Collection, GatewayIntentBits } from 'discord.js';
import Amp from './amp/Amp';
import { config } from './Config';

export default class CustomClient extends Client {
  commands: Collection<string, any>;
  // Single-guild state
  amp: Amp | null;
  messageCache: Map<string, any>;
  updateInterval: NodeJS.Timeout | null;

  constructor() {
    super({ intents: [GatewayIntentBits.Guilds] });
    this.commands = new Collection<string, any>();
    this.amp = null;
    this.messageCache = new Map();
    this.updateInterval = null;
  }

  /**
   * Initialize the state for the single configured guild and create a new Amp instance.
   */
  initializeState() {
    if (!this.amp) {
      // AMP credentials pulled from config
      this.amp = new Amp(config.AMP_USERNAME, config.AMP_PASS, '', false);
      this.messageCache = new Map();
      this.updateInterval = null;
    }
  }

  /**
   * Get the Amp instance for the single guild. Initializes the state if it doesn't exist.
   */
  getAmpInstance(): Amp {
    if (!this.amp) {
      this.initializeState();
    }
    return this.amp!;
  }

  /**
   * Clean up the state for the single guild.
   */
  cleanupState() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    // Clear caches and AMP reference
    this.messageCache.clear();
    this.amp = null;
  }
}
