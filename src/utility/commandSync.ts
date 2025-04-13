import { REST, Routes } from "discord.js";
import { config } from "../config";
import CommandLoader from "./commandLoader";
import CustomClient from "../CustomClient"; // Import the custom client

export default class CommandSync {
    client: CustomClient; // Use the custom client
    rest: REST;

    constructor(client: CustomClient) {
        this.client = client;
        this.rest = new REST().setToken(config.DISCORD_TOKEN);
    }

    async syncGuildCommands(forceUpdate = false) {
        try {
            const guildCommands = await this.rest.get(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID));

            if (this.isCommandUpdateNeeded(guildCommands) || forceUpdate) {
                console.log("Updating guild commands...");
                this.client.commands.clear();
                await new CommandLoader(this.client).loadCommands();

                let commandArray = [];
                for(const temp of this.client.commands) {
                    commandArray.push(temp[1].data.toJSON());
                }

                // Logging the command names or other useful information
                commandArray.forEach(command => {
                    console.log(`Command: ${command.name}`);
                });

                // Sync the commands to the Discord API
                await this.rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
                    body: commandArray,
                });

                console.log(`Successfully registered ${this.client.commands.size} commands.`);
            } else {
                console.log("No command updates required.");
            }
        } catch (error) {
            console.error("Error syncing guild commands:", error);
        }
    }

    isCommandUpdateNeeded(guildCommands: any) {
        if (guildCommands.length !== this.client.commands.size) return true;
        for(const guildCommand of guildCommands) {
            if(!this.client.commands.has(guildCommand.name)) {
                return true;
            }
        }
        return false;
    }
}
