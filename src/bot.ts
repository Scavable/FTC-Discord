import { config } from "./config";
import { Client, Collection, GatewayIntentBits, REST, Routes } from "discord.js";

import EventLoader from "./utility/eventLoader";
import CommandLoader from "./utility/commandLoader";
import AMP from "./amp/amp";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST().setToken(config.DISCORD_TOKEN);

let commandsCollection: Collection<String, any> = new Collection();
client.commands = new Collection();

// Main Execution (Ensures all async steps are completed sequentially)
(async () => {
    try {
        console.log("Starting bot...");

        // Load events using EventLoader
        const eventLoader = new EventLoader(client);
        eventLoader.loadEvents();

        // Load commands using CommandLoader
        const commandLoader = new CommandLoader(client, commandsCollection);
        await commandLoader.loadCommands();

        // Sync guild commands
        await syncGuildCommands();

        // Log in to Discord
        await client.login(config.DISCORD_TOKEN);
        console.log("Bot successfully logged in!");

        const amp = AMP.getInstance();
        amp.setCredentials(config.AMP_USERNAME, config.AMP_PASS, "", false);
        await amp.login();
        //console.log(await amp.getInstances());

    } catch (error) {
        console.error("Error during bot initialization:", error);
    }
})();

async function syncGuildCommands() {
    try {
        const guildCommands = await rest.get(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID));

        if (isCommandUpdateNeeded(guildCommands, commandsCollection)) {
            console.log("Updating guild commands...");
            commandsCollection = new Collection();

            const commandLoader = new CommandLoader(client, commandsCollection);
            await commandLoader.loadCommands();

            let commands = Array.from(commandsCollection.values());

            await rest.put(
                Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
                { body: commands }
            );

            console.log(`Successfully registered ${commandsCollection.size} commands.`);
        } else {
            console.log("No command updates required.");
        }
    } catch (error) {
        console.error('Error syncing guild commands:', error);
    }
}

function isCommandUpdateNeeded(guildCommands, localCommands: Collection<String, any>) {
    if (guildCommands.length !== localCommands.size) return true;

    return guildCommands.some(guildCommand => {
        const localCommand = localCommands.get(guildCommand.name);
        return !localCommand || guildCommand.name !== localCommand.name;
    });
}
