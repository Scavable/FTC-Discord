import { config } from "./Config";
import { REST, Routes } from "discord.js";
import EventLoader from "./utility/EventLoader";
import CommandLoader from "./utility/CommandLoader";
import CommandSync from "./utility/CommandSync";
import Amp from "./amp/Amp";
import CustomClient from "./CustomClient";
import RoleMapper from "./utility/RoleMapper";

const client = new CustomClient(); // Use CustomClient instead of Client
const rest = new REST().setToken(config.DISCORD_TOKEN);

(async () => {
    try {
        console.log("Starting bot...");

        await new EventLoader(client).loadEvents();
        const commandLoader = new CommandLoader(client);
        await commandLoader.loadCommands();

        const commandSync = new CommandSync(client);
        await commandSync.syncGuildCommands();

        await client.login(config.DISCORD_TOKEN);

        const guild = await client.guilds.fetch(config.GUILD_ID);
        const roleMapper = new RoleMapper(guild);
        await roleMapper.initialize();

        const amp = Amp.getInstance(config.AMP_USERNAME, config.AMP_PASS, "", false);
        await amp.login();

    } catch (error) {
        console.error("Error during bot initialization:", error);
    }
})();
