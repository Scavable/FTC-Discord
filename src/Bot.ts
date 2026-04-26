import { config } from './Config';
import EventLoader from './utility/EventLoader';
import CustomClient from './CustomClient';
import { validateConfig } from './validation/Config';

import logger from './utility/Logger';
import DependencyManager from './utility/DependencyManager';
import { scheduleDaily } from './packs/Scheduler';
import { checkForPackUpdates } from './packs/PackUpdateChecker';
import Commands from './utility/Commands';

const client = new CustomClient();
const appConfig = validateConfig(config);

/** Main starting point */
(async () => {

  //Moved logic to functions to make it easier to read and understand what's going on
  try {
    logger.info("Starting bot...");

    /**
     * Verify required dependencies are installed;
     * download any missing ones and update any versions outside the limit
     */
    const dependencyPromise = DependencyManager.verifyDependencies();

    /** Load events and commands from files into the client. */
    const eventLoaderPromise = new EventLoader(client).loadEvents();

    /** Discord Bot Login (Console message located in, Ready.ts) */
    const loginPromise = client.login(appConfig.DISCORD_TOKEN);

    await startupCheck(dependencyPromise, eventLoaderPromise, loginPromise);

    await initializeGuilds();

  } catch (error) {
    console.error("Error during bot initialization:", error);
  }

  // let state = client.getGuildState("986702791521206332");
  // console.log(await state?.amp.getInstances());

  async function startupCheck(
    dependencyPromise: Promise<void>,
    eventLoaderPromise: Promise<void>,
    loginPromise: Promise<string>,
  ) {
    /** Wait for critical startup tasks in parallel */
    const results = await Promise.allSettled([
      dependencyPromise,
      eventLoaderPromise,
      loginPromise,
    ]);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const taskName = ["Dependencies", "Event Loader", "Login"][index];
        logger.error(`${taskName} failed during startup:`, result.reason);
      }
    });

    /** If login failed, we must stop */
    if (results[2].status === "rejected") {
      throw new Error("Critical failure: Discord login failed.");
    }
  }

  async function initializeGuilds() {
    /** Initialize state and update commands for all guilds in parallel */
    await Promise.allSettled(
      appConfig.GUILD_IDS.map(async (guildId) => {
        try {
          const state = await client.initializeGuildState(guildId);

          /** Populate the Servers cache with the current instances from AMP */
          const instances = await state.amp.readFile(
            await state.amp.getInstances(),
          );
          state.servers.setAll(instances);

          /** Update Guild Commands */
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
        } catch (err) {
          logger.error(`Failed to initialize guild ${guildId}:`, err);
        }
      }),
    );
  }

})();
