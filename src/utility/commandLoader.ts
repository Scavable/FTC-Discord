import fs from "node:fs";
import path from "node:path";
import { Client, Collection } from "discord.js";

class CommandLoader {
    private client: Client;
    private commandsCollection: Collection<String, any>;

    constructor(client: Client, commandsCollection: Collection<String, any>) {
        this.client = client;
        this.commandsCollection = commandsCollection;
    }

    async loadCommands() {
        const foldersPath = path.join(__dirname, "../commands");
        const commandFolders = fs.readdirSync(foldersPath);
        const commandPromises = [];

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts"));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const commandModule = require(filePath);
                const commandInstance = new commandModule();
                commandPromises.push(commandInstance.CreateObject());
            }
        }

        const commandObjects = await Promise.all(commandPromises);

        for (const commandObject of commandObjects) {
            if ("data" in commandObject && "execute" in commandObject) {
                this.client.commands.set(commandObject.data.name, commandObject);
                this.commandsCollection.set(commandObject.data.name, commandObject.data.toJSON());
            } else {
                console.warn(`[WARNING] Command is missing required properties.`);
            }
        }
    }
}

export default CommandLoader;