import { config } from "./config";
import { REST, Routes } from "discord.js";
import EventLoader from "./utility/eventLoader";
import CommandLoader from "./utility/commandLoader";
import CommandSync from "./utility/commandSync";
import AMP from "./amp/amp";
import CustomClient from "./CustomClient"; // Import the new class

const client = new CustomClient(); // Use CustomClient instead of Client
const rest = new REST().setToken(config.DISCORD_TOKEN);

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

        const amp = AMP.getInstance(config.AMP_USERNAME, config.AMP_PASS, "", false);
        await amp.login();
    } catch (error) {
        console.error("Error during bot initialization:", error);
    }
})();
