import { Client, type ClientEvents } from 'discord.js';
import events from '../events/index.js';
import logger from "./Logger.js";

/** Define Event module interface */
type EventModule = {
  name: keyof ClientEvents;
  once?: boolean;
  execute: (...args: any[]) => void;
};

class EventLoader {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async loadEvents() {
    logger.info("Loading events...");
    for (const event of events as EventModule[]) {
      const handler = (...args: any[]) => {
        try {
          event.execute(...args);
        } catch (error) {
          console.error(`Error executing event ${event.name}:`, error);
        }
      };

      /** Register event handler based on whether the event should run once or not */
      if (event.once) {
        this.client.once(event.name, handler);
      } else {
        this.client.on(event.name, handler);
      }
    }
  }
}

export default EventLoader;
