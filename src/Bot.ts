import { config } from "./Config";
import EventLoader from "./utility/EventLoader";
import CommandLoader from "./utility/CommandLoader";
import CommandSync from "./utility/CommandSync";
import Amp from "./amp/Amp";
import CustomClient from "./CustomClient";
import RoleMapper from "./utility/RoleMapper";

import logger from './utility/Logger';
import child_process from 'child_process';
import database from "./database/database";

const client = new CustomClient(); // Use CustomClient instead of Client

(async () => {
    try {
        // Install dependencies
        const dep_arr = ["discord.js", "dotenv", "winston", "pg", "prismarine-nbt"]
        for(const dep of dep_arr) {
            child_process.execSync('npm install ' + dep, {stdio:[0,1,2]});
        }

        // Database
        //logger.info("Connecting to database");
        //await database.createUserTable();

        logger.info("Starting bot...");

        // Backbone Classes
        await new EventLoader(client).loadEvents();
        await new CommandLoader(client).loadCommands();
        await new CommandSync(client).syncGuildCommands(false);

        // Discord Bot Login (Console message located in, Ready.ts)
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
