import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client, ClientEvents } from "discord.js";

// Define Event module interface
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
        // Resolving the base directory using __dirname in ESM environment
        const __dirname = path.dirname(import.meta.dirname);
        const eventsPath = path.join(__dirname, "/events");

        // Ensure the events directory exists
        if (!fs.existsSync(eventsPath)) {
            console.error(`Events directory does not exist: ${eventsPath}`);
            return;
        }

        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);

            // Dynamically import the event file
            const event: EventModule = (await import(pathToFileURL(filePath).href)).default;

            const handler = (...args: any[]) => {
                try {
                    event.execute(...args);
                } catch (error) {
                    console.error(`Error executing event ${event.name}:`, error);
                }
            };

            // Register event handler based on whether the event should run once or not
            if (event.once) {
                this.client.once(event.name, handler);
            } else {
                this.client.on(event.name, handler);
            }
        }
    }
}

export default EventLoader;
