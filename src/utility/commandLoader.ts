import fs from "node:fs";
import path from "node:path";
import CustomClient from "../CustomClient";
import { pathToFileURL } from "node:url";

class CommandLoader {
    private client: CustomClient;

    constructor(client: CustomClient) {
        this.client = client;
    }

    async loadCommands() {
        const __dirname = path.dirname(import.meta.dirname);
        const foldersPath = path.join(__dirname, "/commands");
        const commandFolders = fs.readdirSync(foldersPath);
        const commandPromises: Promise<any>[] = [];

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const commandModule = await import(pathToFileURL(filePath).href);
                const commandInstance = new commandModule.default();
                commandPromises.push(commandInstance.createObject());
            }
        }

        const commandObjects = await Promise.all(commandPromises);

        for (const commandObject of commandObjects) {
            if ("data" in commandObject && "execute" in commandObject) {
                this.client.commands.set(commandObject.data.name, commandObject);
            } else {
                console.warn(`[WARNING] Command is missing required properties.`);
            }
        }
    }
}

export default CommandLoader;
