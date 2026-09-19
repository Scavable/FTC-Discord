import { Events } from 'discord.js';

import { config } from './Config.js';
import CustomClient from './CustomClient.js';
import { validateConfig } from './validation/Config.js';

import EventLoader from './utility/EventLoader.js';
import Commands from './utility/Commands.js';
import logger from './utility/Logger.js';
import { scheduleDaily } from './packs/Scheduler.js';
import { checkForPackUpdates } from './packs/PackUpdateChecker.js';

const DEFAULT_UPDATE_CHECK_TIME = '02:00';

/** Grace period so the logger can flush its file transport before we exit. */
const SHUTDOWN_FLUSH_MS = 250;

const client = new CustomClient();
const appConfig = validateConfig(config);
const updateChannelId = appConfig.UPDATE_CHANNEL_ID || undefined;

/** Log the outcome of a single startup task. */
function logTaskResult(name: string, result: PromiseSettledResult<unknown>): void {
  if (result.status === 'rejected') {
    logger.error(`${name} failed during startup:`, result.reason);
  } else {
    logger.info(`${name} completed successfully`);
  }
}

/** Wait for the critical startup tasks; only a failed login is fatal. */
async function startupCheck(eventLoader: Promise<void>, login: Promise<string>): Promise<void> {
  logger.info('Startup check...');

  /** Wait for critical startup tasks in parallel */
  const [eventLoaderResult, loginResult] = await Promise.allSettled([eventLoader, login]);

  logTaskResult('Event Loader', eventLoaderResult);
  logTaskResult('Login', loginResult);

  /** If login failed, we must stop */
  if (loginResult.status === 'rejected') {
    throw new Error('Critical failure: Discord login failed.');
  }

  logger.info('Startup check complete.');
}

/** Ensure the client is fully ready before accessing guilds/channels. */
async function waitUntilReady(): Promise<void> {
  if (client.isReady()) return;

  logger.info('Waiting for Discord ready before initial pack update check...');
  await new Promise<void>((resolve) => client.once(Events.ClientReady, () => resolve()));
}

/** Initialize state, sync commands and wire up pack update checks for the guild. */
async function initializeGuild(guildId: string): Promise<void> {
  logger.info('Initializing guild state...');
  await waitUntilReady();

  try {
    const state = await client.initializeGuildState(guildId);
    const instances = await state.amp.readFile(await state.amp.getInstances());
    state.servers.setAll(instances);

    await new Commands(client).updateGuildCommands(guildId);

    const packUpdateCheck = () => checkForPackUpdates(client, guildId, updateChannelId);

    /** Schedule daily pack update checks for this guild */
    scheduleDaily(
      `PackUpdate_${guildId}`,
      appConfig.UPDATE_CHECK_TIME || DEFAULT_UPDATE_CHECK_TIME,
      packUpdateCheck,
    );

    /** Also run once on startup for this guild */
    logger.info('Triggering initial pack update check...');
    packUpdateCheck().catch((err) => {
      logger.error(`Initial pack update check failed for guild ${guildId}:`, err);
    });

    logger.info(`Initialized guild ${guildId}`);
  } catch (err) {
    logger.error(`Failed to initialize guild ${guildId}:`, err);
  }
}

/** Main starting point */
async function main(): Promise<void> {
  logger.info('Starting application...');

  /** Load events and commands from files into the client. */
  const eventLoaderPromise = new EventLoader(client).loadEvents();

  /** Discord Bot Login (Console message located in, Ready.ts) */
  logger.info('Logging in to Discord...');
  const loginPromise = client.login(appConfig.DISCORD_TOKEN);

  await startupCheck(eventLoaderPromise, loginPromise);
  await initializeGuild(appConfig.GUILD_ID);
}

/** Close the gateway connection and exit, rather than lingering in a half-started state. */
async function shutdown(code: number): Promise<void> {
  process.exitCode = code;

  try {
    await client.destroy();
  } catch (err) {
    logger.error('Failed to close the Discord connection during shutdown:', err);
  }

  /** Force the exit if anything is still holding the event loop open. */
  setTimeout(() => process.exit(code), SHUTDOWN_FLUSH_MS).unref();
}

main().catch(async (error) => {
  logger.error('Error during bot initialization:', error);
  await shutdown(1);
});
