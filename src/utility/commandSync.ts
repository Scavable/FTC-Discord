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
                await new CommandLoader(this.client, this.client.commands).loadCommands();
                await this.rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
                    body: Array.from(this.client.commands.values()),
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
        return guildCommands.some((guildCommand: any) => {
            const localCommand = this.client.commands.get(guildCommand.name);
            return !localCommand || guildCommand.name !== localCommand.name;
        });
    }
}
