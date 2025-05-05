import { Events } from 'discord.js';
import CustomClient from "../CustomClient";
import logger from "../utility/Logger";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: CustomClient) {
        logger.info(client.isReady() ? "Bot is ready!" : "Bot is not ready yet...");
        if(!!client.user)
            logger.info(`Logged in as ${client.user.tag}`);
    },
};
