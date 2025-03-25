import fs from "node:fs";
import path from "node:path";
import { Client } from "discord.js";

class EventLoader {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    loadEvents() {
        const eventsPath = path.join(__dirname, "../events");
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".ts"));

        for (const file of eventFiles) {
            const event = require(path.join(eventsPath, file));

            const handler = (...args: any[]) => {
                try {
                    event.execute(...args);
                } catch (error) {
                    console.error(`Error executing event ${event.name}:`, error);
                }
            };

            if (event.once) {
                this.client.once(event.name, handler);
            } else {
                this.client.on(event.name, handler);
            }
        }
    }
}

export default EventLoader;
