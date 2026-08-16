import {config} from './Config.js';
import EventLoader from './utility/EventLoader.js';
import CustomClient from './CustomClient.js';
import { validateConfig } from './validation/Config.js';

import logger from './utility/Logger.js';
import { scheduleDaily } from './packs/Scheduler.js';
import { checkForPackUpdates } from './packs/PackUpdateChecker.js';
import Commands from './utility/Commands.js';

const client = new CustomClient();
const appConfig = validateConfig(config);

/** Main starting point */
(async () => {

  //Moved logic to functions to make it easier to read and understand what's going on
  try {
    logger.info("Starting application...");

    /** Load events and commands from files into the client. */
    const eventLoaderPromise = new EventLoader(client).loadEvents();

    /** Discord Bot Login (Console message located in, Ready.ts) */
    logger.info("Logging in to Discord...");
    const loginPromise = client.login(appConfig.DISCORD_TOKEN);

    await startupCheck(eventLoaderPromise, loginPromise);

    await initializeGuild();
  } catch (error) {
    console.error("Error during bot initialization:", error);
  }

  async function startupCheck(
    eventLoaderPromise: Promise<void>,
    loginPromise: Promise<string>,
  ) {
    logger.info("Startup check...");
    /** Wait for critical startup tasks in parallel */
    const results = await Promise.allSettled([
      eventLoaderPromise,
      loginPromise,
    ]);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const taskName = ["Event Loader", "Login"][index];
        logger.error(`${taskName} failed during startup:`, result.reason);
      }else if(result.status === "fulfilled"){
        const taskName = ["Event Loader", "Login"][index];
        logger.info(`${taskName} completed successfully`);
      }
    });

    /** If login failed, we must stop */
    if (results[1].status === "rejected") {
      throw new Error("Critical failure: Discord login failed.");
    }
    logger.info("Startup check complete.");
  }

  async function initializeGuild() {
    logger.info("Initializing guild state...");
    /** Initialize state and update commands for all guilds in parallel */
    const guildId = appConfig.GUILD_ID;
    try{
      const state = await client.initializeGuildState(guildId);
      const instances = await state.amp.readFile(await state.amp.getInstances());
      state.servers.setAll(instances);
      await new Commands(client).updateGuildCommands(guildId);
      /** Schedule daily pack update checks for this guild */
      scheduleDaily(
        `PackUpdate_${guildId}`,
        appConfig.UPDATE_CHECK_TIME || "02:00",
        async () => {
          await checkForPackUpdates(
            client,
            guildId,
            appConfig.UPDATE_CHANNEL_ID || undefined,
          );
        },
      );

      /** Also run once on startup for this guild */
      checkForPackUpdates(
        client,
        guildId,
        appConfig.UPDATE_CHANNEL_ID || undefined,
      ).catch((err) => {
        logger.error(
          `Initial pack update check failed for guild ${guildId}:`,
          err,
        );
      });
      logger.info(`Initialized guild ${guildId}`);
    }catch (err){
      logger.error(`Failed to initialize guild ${guildId}:`, err);
    }
  }

})();

