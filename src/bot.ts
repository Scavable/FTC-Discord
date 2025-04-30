import { config } from "./config";
import { REST, Routes } from "discord.js";
import EventLoader from "./utility/eventLoader";
import CommandLoader from "./utility/commandLoader";
import CommandSync from "./utility/commandSync";
import AMP from "./amp/amp";
import CustomClient from "./CustomClient";
import RoleMapper from "./utility/RoleMapper";

import logger from './utility/Logger'

const client = new CustomClient(); // Use CustomClient instead of Client
const rest = new REST().setToken(config.DISCORD_TOKEN);

(async () => {
    try {
        logger.info("Starting bot...");

        //Backbone Classes
        await new EventLoader(client).loadEvents();
        await new CommandLoader(client).loadCommands();
        await new CommandSync(client).syncGuildCommands(false);

        // Discord Bot Login (Console message located in, ready.ts)
        await client.login(config.DISCORD_TOKEN);


        const guild = await client.guilds.fetch(config.GUILD_ID);
        const roleMapper = new RoleMapper(guild);
        await roleMapper.initialize();

        const amp = AMP.getInstance(config.AMP_USERNAME, config.AMP_PASS, "", false);
        await amp.login();

    } catch (error) {
        console.error("Error during bot initialization:", error);
    }
})();
