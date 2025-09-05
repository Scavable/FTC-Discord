import CustomClient from '../CustomClient';
import CommandRegistry from './CommandRegistry';
import logger from './Logger';

class CommandLoader {
  private client: CustomClient;

  constructor(client: CustomClient) {
    this.client = client;
  }

  async loadCommands() {
    try {
      // Load commands from CommandRegistry
      const instanceObjects = CommandRegistry.getCommands();
      let commandObject

      for (const instanceObject of instanceObjects) {
        if (instanceObject.enabled) {
          commandObject = await instanceObject.createObject();

          if ('data' in commandObject && 'execute' in commandObject) {
            this.client.commands.set(commandObject.data.name, commandObject);
            logger.commands(`Loaded command: ${commandObject.data.name}`);
          } else {
            console.warn(`[WARNING] Command is missing required properties.`);
          }
        }
      }

      logger.info('All commands loaded successfully.');
    } catch (error) {
      console.error('[ERROR] Failed to load commands:', error);
      throw error;
    }
  }
}

export default CommandLoader;
