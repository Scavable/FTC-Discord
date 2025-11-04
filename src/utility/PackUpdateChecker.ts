import { TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import CustomClient from '../CustomClient';
import Amp from '../amp/Amp';
import Instance from '../types/Instance';
import logger from './Logger';
import { getLatestByPackNameAPI } from './CurseForgeApi';

function normalizeServerName(name: string): string {
  // Remove leading two digits and space (e.g., "01 My Pack" -> "My Pack")
  const n = name.replace(/^[0-9]{2}\s/, '').trim();
  return n;
}

function shouldSkip(server: Instance): boolean {
  return (
    server.FriendlyName.includes('ADS') ||
    server.FriendlyName.includes('Bot') ||
    server.FriendlyName.includes('Scheduler') ||
    server.Suspended ||
    server.Hidden
  );
}

export async function checkForPackUpdates(client: CustomClient, channelId?: string): Promise<void> {
  const amp: Amp = client.getAmpInstance();
  await amp.login();

  // Refresh servers and pack info from AMP (updates FTCVersion, FTCIP, Hidden, Whitelisted)
  const servers: Instance[] = await amp.readFile(await amp.getInstances());

  const updates: {
    server: Instance;
    packName: string;
    currentVersion: string;
    latestFileName: string;
    latestUrl: string;
  }[] = [];

  for (const s of servers) {
    if (shouldSkip(s)) continue;

    const queryNameRaw = (s.PackName && s.PackName.trim().length > 0)
      ? s.PackName.trim()
      : normalizeServerName(s.FriendlyName);
    const packName = queryNameRaw.replace(/\s+/g, ' ');
    const currentVersion = s.FTCVersion || '';

    try {
      const usedPackName = !!(s.PackName && s.PackName.trim().length > 0);
      const latest = await getLatestByPackNameAPI(packName, { strict: usedPackName });
      if (!latest) {
        logger.warn(`[PackUpdate] No strong CurseForge match for QueryUsed=${usedPackName ? 'PackName' : 'FriendlyName'}="${packName}" (Server=${s.FriendlyName}). Skipping to avoid mismatch.`);
        continue;
      }

      logger.updates(`[PackUpdate] Server=${s.FriendlyName} | QueryUsed=${usedPackName ? 'PackName' : 'FriendlyName'}="${packName}" | Matched=${latest.mod.name} (${latest.mod.slug || 'no-slug'}#${latest.mod.id}) | MatchType=${latest.matchType ?? 'n/a'} | Score=${latest.matchScore ?? 'n/a'}`);

      const latestName = latest.latestFile.displayName || latest.latestFile.fileName;

      // Simple comparison heuristic: if current version string is not contained in latest file name, assume an update is available.
      // This is intentionally conservative due to varied naming schemes.
      if (currentVersion && latestName.includes(currentVersion)) {
        continue; // up to date
      }

      updates.push({
        server: s,
        packName,
        currentVersion: currentVersion || 'N/A',
        latestFileName: latestName,
        latestUrl: latest.latestFileUrl,
      });
    } catch (err: any) {
      logger.warn(`[PackUpdate] Failed check for ${packName}: ${err?.message ?? err}`);
    }
  }

  if (updates.length === 0) {
    logger.info('[PackUpdate] No updates found.');
    return;
  }

  // Log summary
  logger.updates(`[PackUpdate] Updates detected (Total ${updates.length}). Posting per-pack messages...`);

  if (!channelId) {
    for (const u of updates) {
      logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestFileName} ${u.latestUrl}`);
    }
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.warn(`[PackUpdate] Channel ID ${channelId} not found or not a text channel.`);
      for (const u of updates) {
        logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestFileName} ${u.latestUrl}`);
      }
      return;
    }

    // Purge previous bot messages in the channel before posting new updates
    try {
      const fetched = await channel.messages.fetch({ limit: 100 });
      const botId = client.user?.id;
      const toDelete = botId ? fetched.filter(m => m.author.id === botId) : fetched;
      if (toDelete.size > 0) {
        await channel.bulkDelete(toDelete, true).catch((e: any) => {
          logger.warn(`[PackUpdate] bulkDelete failed or partially succeeded in channel ${channelId}: ${e?.message ?? e}`);
        });
      }
    } catch (purgeErr: any) {
      logger.warn(`[PackUpdate] Failed to purge previous messages in channel ${channelId}: ${purgeErr?.message ?? purgeErr}`);
    }

    // Post individual messages with a "Completed" button
    for (const u of updates) {
      const embed = new EmbedBuilder()
        .setTitle(`Update: ${u.packName}`)
        .setDescription(`Current: ${u.currentVersion}\nLatest: ${u.latestFileName}`)
        .setURL(u.latestUrl);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('packupdate:complete')
          .setLabel('Completed')
          .setStyle(ButtonStyle.Success)
      );

      await channel.send({ embeds: [embed], components: [row] });
    }
  } catch (err: any) {
    logger.warn(`[PackUpdate] Failed to send messages to channel ${channelId}: ${err?.message ?? err}`);
    for (const u of updates) {
      logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestFileName} ${u.latestUrl}`);
    }
  }
}
