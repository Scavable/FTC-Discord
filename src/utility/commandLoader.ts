
import fs from "node:fs";
import path from "node:path";
import CustomClient from "../CustomClient";
import {fileURLToPath, pathToFileURL} from "node:url";
import logger from "./Logger";

class CommandLoader {
    private client: CustomClient;

    constructor(client: CustomClient) {
        this.client = client;
    }

    async loadCommands() {
        // Correctly resolve the directory path in ESM
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const commandsPath = path.join(__dirname, "../commands");

        try {
            const commandPromises = [];

            // Use async directory reading
            const folders = await fs.promises.readdir(commandsPath, { withFileTypes: true });

            for (const folder of folders) {
                if (!folder.isDirectory()) continue;

                const folderPath = path.join(commandsPath, folder.name);
                const files = await fs.promises.readdir(folderPath);
                const commandFiles = files.filter(file => file.endsWith(".ts") || file.endsWith(".js"));

                for (const file of commandFiles) {
                    const filePath = path.join(folderPath, file);
                    try {
                        const commandModule = await import(pathToFileURL(filePath).href);
                        const commandInstance = new commandModule.default();
                        commandPromises.push(commandInstance.createObject());
                    } catch (error) {
                        console.error(`Error loading command from ${file}:`, error);
                    }
                }
            }

            const commandObjects = await Promise.allSettled(commandPromises);

            for (const result of commandObjects) {
                if (result.status === 'fulfilled') {
                    const commandObject = result.value;
                    if ("data" in commandObject && "execute" in commandObject) {
                        this.client.commands.set(commandObject.data.name, commandObject);
                        logger.commands(`Loaded command: ${commandObject.data.name}`);
                    } else {
                        console.warn(`[WARNING] Command is missing required properties.`);
                    }
                } else {
                    console.error('[ERROR] Failed to load command:', result.reason);
                }
            }
        } catch (error) {
            console.error('[ERROR] Failed to load commands:', error);
            throw error;
        }
    }
}

export default CommandLoader;