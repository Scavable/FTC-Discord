import { config } from './Config';
import EventLoader from './utility/EventLoader';
import CommandLoader from './utility/CommandLoader';
import CommandSync from './utility/CommandSync';
import Amp from './amp/Amp';
import CustomClient from './CustomClient';
import RoleMapper from './utility/RoleMapper';

import logger from './utility/Logger';
import child_process from 'child_process';
import ServersFile from './utility/ServersFile';
import fs from 'node:fs';

const client = new CustomClient(); // Use CustomClient instead of Client

(async () => {
  try {
    // Check and Install dependencies if missing
    const dep_arr: string[] = [
      'discord.js@14.21.0',
      'dotenv@17.0.1',
      'winston@3.17.0',
      'pg@8.16.3',
      'prismarine-nbt@2.7.0',
    ];
    for (const dep of dep_arr) {
      try {
        logger.info(child_process.execSync('npm ls ' + dep).toString());
      } catch (e) {
        logger.warn(
          `Installing missing dependency: ` +
            child_process.execSync(`npm install ` + dep).toString(),
        );
      }
    }

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

    // Initialize AMP
    const amp = Amp.getInstance(
      config.AMP_USERNAME,
      config.AMP_PASS,
      '',
      false,
    );
    await amp.login();
  } catch (error) {
    console.error('Error during bot initialization:', error);
  }
})();
