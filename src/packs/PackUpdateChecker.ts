import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from 'discord.js';
import CustomClient from '../CustomClient';
import Amp from '../amp/ads/Amp';
import Instance from '../types/Instance';
import logger from '../utility/Logger';
import { getLatestByPackNameAPI } from './CurseForgeApi';
import Servers from '../utility/Servers';
import Instances from '../utility/Instances';

function normalizeServerName(name: string): string {
  /** Remove leading two digits and space (e.g., "01 My Pack" -> "My Pack") */
  return name.replace(/^[0-9]{2}\s/, '').trim();
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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

  /**
   * If the cache was just populated (e.g., by Bot.ts at startup), avoid immediately refreshing again.
   * Treat cache as fresh for 30 seconds to prevent duplicate AMP calls on startup.
   */
  const FRESH_TTL_MS = 30_000;
  let servers: Instance[];

  if (Servers.getAll().length > 0 && Servers.isFresh(FRESH_TTL_MS)) {
    logger.info('[PackUpdate] Using fresh servers cache; skipping AMP refresh.');
    servers = Servers.getAll();
  } else {
    await amp.login();
    const minecraftServers = await new Instances(amp).getMinecraftInstances();
    const refreshed = await amp.readFile(minecraftServers);
    Servers.setAll(refreshed);
    servers = Servers.getAll();
  }

  /** Refresh servers and pack info from AMP (updates FTCVersion, FTCIP, Hidden, Whitelisted) */
  const updates: {
    server: Instance;
    packName: string;
    currentVersion: string;
    latestVersion: string;
    latestUrl: string;
    uploadedAt: string;
  }[] = [];

  await Promise.all(
    servers.map(async (server) => {
      if (shouldSkip(server)) return;

      const queryUsed =
        server.CurseForgeURL && server.CurseForgeURL.trim().length > 0
          ? 'CurseForgeURL'
          : server.PackName && server.PackName.trim().length > 0
            ? 'PackName'
            : 'FriendlyName';

      const packQuery =
        queryUsed === 'CurseForgeURL'
          ? server.CurseForgeURL!.trim()
          : queryUsed === 'PackName'
            ? server.PackName.trim()
            : normalizeServerName(server.FriendlyName);

      const currentVersion = server.FTCVersion || '';

      try {
        const latest = await getLatestByPackNameAPI(packQuery, {
          strict: queryUsed !== 'FriendlyName',
        });
        if (!latest) {
          logger.warn(
            `[PackUpdate] No strong CurseForge match for ${queryUsed}="${packQuery}" (Server=${server.FriendlyName}). Skipping.`,
          );
          return;
        }

        logger.updates(
          `[PackUpdate] Server=${server.FriendlyName} | ${queryUsed}="${packQuery}" | Matched=${latest.mod.name} (${latest.mod.slug || 'no-slug'}#${latest.mod.id}) | Score=${latest.matchScore}`,
        );

        const latestNameRaw =
          latest.latestFile.displayName || latest.latestFile.fileName;
        let latestVersion = latestNameRaw;

        /** Extract version pattern (x.x.x or x.x.x.x etc.) */
        const versionMatch = latestNameRaw.match(/(\d+(?:\.\d+)+)/);
        if (versionMatch) {
          latestVersion = versionMatch[1];
        }

        /**
         * Simple comparison heuristic: if current version string is not contained in latest file name, assume an update is available.
         * This is intentionally conservative due to varied naming schemes.
         * Normalize: remove 'v' prefix if present for comparison
         */
        const normCurrent = currentVersion.toLowerCase().replace(/^v/, '');
        const normLatestName = latestNameRaw.toLowerCase();

        if (
          currentVersion &&
          (normLatestName.includes(normCurrent) ||
            normLatestName.includes(currentVersion.toLowerCase()))
        ) {
          return; /** up to date */
        }

        updates.push({
          server: server,
          packName: latest.mod.name,
          currentVersion: currentVersion || 'N/A',
          latestVersion: latestVersion,
          latestUrl: latest.latestFileUrl,
          uploadedAt: latest.latestFile.fileDate,
        });
      } catch (err: any) {
        logger.warn(
          `[PackUpdate] Failed check for ${packQuery}: ${err?.message ?? err}`,
        );
      }
    }),
  );

  if (updates.length === 0) {
    logger.info('[PackUpdate] No updates found.');
    return;
  }

  /** Log summary */
  logger.updates(`[PackUpdate] Updates detected (Total ${updates.length}). Posting per-pack messages...`);

  if (!channelId) {
    for (const u of updates) {
      logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestVersion} (Uploaded: ${formatDate(u.uploadedAt)}) ${u.latestUrl}`);
    }
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.warn(`[PackUpdate] Channel ID ${channelId} not found or not a text channel.`);
      for (const u of updates) {
        logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestVersion} (Uploaded: ${formatDate(u.uploadedAt)}) ${u.latestUrl}`);
      }
      return;
    }

    /** Purge previous bot messages in the channel before posting new updates */
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

    /** Post individual messages with a "Completed" button */
    for (const u of updates) {
      const embed = new EmbedBuilder()
        .setTitle(`Update: ${u.packName}`)
        .setDescription(`**Current:** ${u.currentVersion}\n**Latest:** ${u.latestVersion}\n**Uploaded:** ${formatDate(u.uploadedAt)}`)
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
      logger.info(`[PackUpdate] - Update ${u.packName}: ${u.currentVersion} -> ${u.latestVersion} (Uploaded: ${formatDate(u.uploadedAt)}) ${u.latestUrl}`);
    }
  }
}
