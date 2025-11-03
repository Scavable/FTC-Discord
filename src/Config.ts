import dotenv from 'dotenv';

dotenv.config();

const {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  AMP_USERNAME,
  AMP_PASS,
  UPDATE_CHECK_TIME,
  UPDATE_CHANNEL_ID,
  CURSEFORGE_API_KEY,
} = process.env;

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

export const config = {
  DISCORD_TOKEN,
  CLIENT_ID,
  GUILD_ID,
  AMP_USERNAME,
  AMP_PASS,
  UPDATE_CHECK_TIME: UPDATE_CHECK_TIME || '02:00',
  UPDATE_CHANNEL_ID: UPDATE_CHANNEL_ID || '',
  CURSEFORGE_API_KEY,
};
