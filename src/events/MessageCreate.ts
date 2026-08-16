import { Events, Message, TextChannel } from 'discord.js';
import CustomClient from '../CustomClient.js';
import { config } from '../Config.js';
import logger from '../utility/Logger.js';

const DISBOARD_BOT_ID = '302050872383242240';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export default {
  name: Events.MessageCreate,
  async execute(message: Message) {
    /** Only process messages from Disboard bot */
    if (message.author.id !== DISBOARD_BOT_ID) return;

    /**
     * Check if the message indicates a successful bump
     * Disboard usually sends an embed with "Bump done!"
     * Without MessageContent intent, content and embeds might be empty for other bots.
     * However, we check both just in case, and also check interaction property if available.
     */
    const isBumpDone = (message.embeds && message.embeds.some(embed => 
      embed.description?.includes('Bump done!') || 
      embed.title?.includes('Bump done!')
    )) || (message.content && message.content.includes('Bump done!')) ||
    (message.interactionMetadata && (message.interactionMetadata as any).commandName === 'bump');

    if (isBumpDone) {
      const client = message.client as CustomClient;
      
      /** Clear existing timer if any */
      if (client.disboardTimer) {
        clearTimeout(client.disboardTimer);
      }

      logger.info('Disboard bump detected. Setting reminder for 2 hours.');

      client.disboardTimer = setTimeout(async () => {
        try {
          const channelId = config.DISBOARD_CHANNEL_ID || message.channelId;
          const channel = await client.channels.fetch(channelId) as TextChannel;
          
          if (channel && channel.isTextBased()) {
            await channel.send('🔔 **Reminder:** It has been 2 hours since the last bump! You can now use `/bump` again to grow the server!');
            logger.info('Disboard reminder sent.');
          }
        } catch (error) {
          logger.error('Failed to send Disboard reminder:', error);
        } finally {
          client.disboardTimer = null;
        }
      }, TWO_HOURS_MS);
    }
  },
};

