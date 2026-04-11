import { config } from './Config';
import EventLoader from './utility/EventLoader';
import CustomClient from './CustomClient';
import RoleMapper from './utility/RoleMapper';
import { validateConfig } from './validation/Config';

import logger from './utility/Logger';
import DependencyManager from './utility/DependencyManager';
import child_process from 'child_process';
import { scheduleDaily } from './packs/Scheduler';
import { checkForPackUpdates } from './packs/PackUpdateChecker';
import Amp from './amp/ads/Amp';
import Commands from './utility/Commands';

const client = new CustomClient();
const appConfig = validateConfig(config);

/** Main starting point */
(async () => {
  try {
    logger.info("Starting bot...");

    /**
     * Verify required dependencies are installed;
     * download any missing ones and update any versions outside the limit
     */
    const dependencyPromise = DependencyManager.verifyDependencies();

    const amp = new Amp(appConfig.AMP_USERNAME, appConfig.AMP_PASS, appConfig.AMP_API_BASE_URL || "", false);

    /** Load events and commands from files into the client. */
    const eventLoaderPromise = new EventLoader(client).loadEvents();

    /** Discord Bot Login (Console message located in, Ready.ts) */
    const loginPromise = client.login(appConfig.DISCORD_TOKEN);

    /** Wait for critical startup tasks in parallel */
    const results = await Promise.allSettled([
      dependencyPromise,
      eventLoaderPromise,
      loginPromise
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const taskName = ['Dependencies', 'Event Loader', 'Login'][index];
        logger.error(`${taskName} failed during startup:`, result.reason);
      }
    });

    /** If login failed, we must stop */
    if (results[2].status === 'rejected') {
      throw new Error("Critical failure: Discord login failed.");
    }

    /** Initialize state and update commands for all guilds in parallel */
    await Promise.allSettled(appConfig.GUILD_IDS.map(async (guildId) => {
      try {
        const state = await client.initializeGuildState(guildId);
        
        /** Populate the Servers cache with the current instances from AMP */
        const instances = await state.amp.readFile(await state.amp.getInstances());
        state.servers.setAll(instances);

        /** Update Guild Commands */
        await new Commands(client).updateGuildCommands(guildId);

        /** Schedule daily pack update checks for this guild */
        scheduleDaily(`PackUpdate_${guildId}`, appConfig.UPDATE_CHECK_TIME || '02:00', async () => {
          await checkForPackUpdates(client, guildId, appConfig.UPDATE_CHANNEL_ID || undefined);
        });

        /** Also run once on startup for this guild */
        checkForPackUpdates(client, guildId, appConfig.UPDATE_CHANNEL_ID || undefined).catch(err => {
          logger.error(`Initial pack update check failed for guild ${guildId}:`, err);
        });

        logger.info(`Initialized guild ${guildId}`);
      } catch (err) {
        logger.error(`Failed to initialize guild ${guildId}:`, err);
      }
    }));
  } catch (error) {
    console.error("Error during bot initialization:", error);
  }
})();
