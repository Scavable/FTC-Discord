import { config } from "./config";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import EventLoader from "./utility/eventLoader";
import CommandLoader from "./utility/commandLoader";
import CommandSync from "./utility/commandSync";
import AMP from "./amp/amp";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

(async () => {
    try {
        console.log("Starting bot...");

        new EventLoader(client).loadEvents();
        const commandLoader = new CommandLoader(client, client.commands);
        await commandLoader.loadCommands();

        const commandSync = new CommandSync(client);
        await commandSync.syncGuildCommands();

        await client.login(config.DISCORD_TOKEN);
        console.log("Bot successfully logged in!");

        const amp = AMP.getInstance();
        amp.setCredentials(config.AMP_USERNAME, config.AMP_PASS, "", false);
        await amp.login();
    } catch (error) {
        console.error("Error during bot initialization:", error);
    }
})();
