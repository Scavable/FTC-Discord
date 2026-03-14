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
import Servers from './utility/Servers';
import Commands from './utility/Commands';
import Instances from "./utility/Instances";

const client = new CustomClient();
const appConfig = validateConfig(config);

/** Main starting point */
(async () => {
  try {
    /**
     * Verify required dependencies are installed;
     * download any missing ones and update any versions outside the limit
     */
    await DependencyManager.verifyDependencies();

    let amp = new Amp(config.AMP_USERNAME, config.AMP_PASS, "", false);

    /**
     * Populate the Servers cache with the current instances from AMP
     * Must be done in sync to avoid race conditions with other operations
     */
    await (async () => {
      let instances = await amp.readFile(await amp.getInstances());
      Servers.setAll(instances);
    })();

    logger.info("Starting bot...");

    /** Load events and commands from files into the client. */
    const eventLoaderPromise = new EventLoader(client).loadEvents();
    const commandUpdatePromise = new Commands(client).updateGuildCommands();

    /** Discord Bot Login (Console message located in, Ready.ts) */
    const loginPromise = client.login(appConfig.DISCORD_TOKEN);

    /** Wait for critical startup tasks in parallel */
    await Promise.all([eventLoaderPromise, commandUpdatePromise, loginPromise]);

    /** Initialize Discord info */
    const guild = await client.guilds.fetch(config.GUILD_ID);
    await new RoleMapper(guild).initialize();

    /** Schedule daily pack update checks */
    scheduleDaily("PackUpdate", config.UPDATE_CHECK_TIME, async () => {
      await checkForPackUpdates(client, config.UPDATE_CHANNEL_ID || undefined);
    });

    /** Also run once on startup */
    await checkForPackUpdates(client, config.UPDATE_CHANNEL_ID || undefined);
  } catch (error) {
    console.error("Error during bot initialization:", error);
  }
})();
