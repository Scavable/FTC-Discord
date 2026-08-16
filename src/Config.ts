import dotenv from 'dotenv';

dotenv.config();

/** Values from environment variables */
const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  AMP_USERNAME,
  AMP_PASS,
  AMP_API_BASE_URL,
  UPDATE_CHECK_TIME,
  UPDATE_CHANNEL_ID,
  CURSEFORGE_API_KEY,
  AUTO_UPDATE_DEPS,
  NODE_ENV,
  DISBOARD_CHANNEL_ID,
  DISABLED_COMMANDS,
  LOG_LEVEL,
} = process.env;

/** Check for required environment variables */
if (
  !DISCORD_TOKEN ||
  !CLIENT_ID ||
  !GUILD_ID ||
  !AMP_USERNAME ||
  !AMP_PASS ||
  !CURSEFORGE_API_KEY
) {
  throw new Error('Missing environment variables');
}

/** Assigned default values for optional config items */
export const config = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  AMP_USERNAME,
  AMP_PASS,
  AMP_API_BASE_URL,
  UPDATE_CHECK_TIME: UPDATE_CHECK_TIME || '02:00',
  UPDATE_CHANNEL_ID: UPDATE_CHANNEL_ID || '',
  CURSEFORGE_API_KEY,
  AUTO_UPDATE_DEPS: (AUTO_UPDATE_DEPS || '').toLowerCase() === 'true',
  IS_PROD: (NODE_ENV || '').toLowerCase() === 'production',
  DISBOARD_CHANNEL_ID: DISBOARD_CHANNEL_ID || '',
  DISABLED_COMMANDS: (DISABLED_COMMANDS || '').split(',').map(name => name.trim()).filter(name => name.length > 0),
  LOG_LEVEL: (LOG_LEVEL || 'log'), // 'log' | 'debug' | 'deep'
};
