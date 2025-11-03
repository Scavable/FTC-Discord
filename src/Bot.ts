import { config } from './Config';
import EventLoader from './utility/EventLoader';
import CommandLoader from './utility/CommandLoader';
import CommandSync from './utility/CommandSync';
import CustomClient from './CustomClient';
import RoleMapper from './utility/RoleMapper';
import { validateConfig } from './validation/Config';

import logger from './utility/Logger';
import child_process from 'child_process';
import ServersFile from './utility/ServersFile';
import fs from 'node:fs';
import { scheduleDaily } from './utility/Scheduler';
import { checkForPackUpdates } from './utility/PackUpdateChecker';

const client = new CustomClient(); // Use CustomClient instead of Client
validateConfig(config);

(async () => {
  try {
    // Verify required dependencies are installed; fail fast with helpful message
    const required = ['discord.js', 'dotenv', 'winston', 'prismarine-nbt'];
    logger.info('Verifying dependencies...');
    for (const dep of required) {
      try {
        child_process.execSync(`npm ls ${dep}`, { stdio: 'ignore' });
      } catch {
        throw new Error(`Missing dependency: ${dep}. Please run "npm install" before starting the bot.`);
      }
    }
    logger.info('All dependencies verified.');

    logger.info('Starting bot...');

    // Load servers.json file into cache (if exists)
    if (fs.existsSync('servers.json')) { ServersFile.readFile('servers.json'); }

    // Backbone Classes
    await new EventLoader(client).loadEvents();
    await new CommandLoader(client).loadCommands();
    await new CommandSync(client).syncGuildCommands(true);

    // Discord Bot Login (Console message located in, Ready.ts)
    await client.login(config.DISCORD_TOKEN);

    // Initialize Discord info
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const roleMapper = new RoleMapper(guild);
    await roleMapper.initialize();

    // Schedule daily pack update checks
    scheduleDaily('PackUpdate', config.UPDATE_CHECK_TIME, async () => {
      await checkForPackUpdates(client, config.UPDATE_CHANNEL_ID || undefined);
    });

    // Also run once on startup
    await checkForPackUpdates(client, config.UPDATE_CHANNEL_ID || undefined);

  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
})();
