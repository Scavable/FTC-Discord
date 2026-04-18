import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  ModalSubmitInteraction,
  User,
} from 'discord.js';
import Instance from '../../types/Instance';
import CustomClient from '../../CustomClient';
import { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand';
import logger from '../../utility/Logger';
import {GuildState} from '../../CustomClient';

export default class Whitelist implements BaseCommand {
  static commandName: string = 'whitelist';
  static commandDescription: string = 'Add a player to the whitelist';

  private static readonly pollIntervalMs = 500;
  private static readonly maxWaitMs = 12000;

  private static readonly whitelistResultPhrases = [
    'Player is already whitelisted',
    'Player is not whitelisted',
    'That player does not exist',
  ];

  private static wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(Whitelist.commandName)
      .setDescription(Whitelist.commandDescription)
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The discord user')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('ign')
          .setDescription("The player's IGN")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('option')
          .setDescription('Add or remove')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
          ),
      )
      .addStringOption((option) =>
        option
          .setName('server')
          .setDescription('The server')
          .setAutocomplete(true)
          .setRequired(true),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async (interaction) => {
      await interaction.deferReply();
      const user = interaction.options.getUser('user');
      const ign = interaction.options.getString('ign');
      const option = interaction.options.getString('option');
      const server = interaction.options.getString('server');

      if (!user || !ign || !option || !server) {
        return interaction.editReply('Invalid or missing options.');
      }

      await this.executeWhitelistCommand(
        interaction,
        server,
        option,
        ign,
        user,
      );
    };
  }

  private async updateUserRole(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    user: User,
    targetServer: Instance,
    operation: string,
  ): Promise<string> {
    if (!targetServer.RoleName || !interaction.guildId || !interaction.guild) return '';
    const customClient = interaction.client as CustomClient;
    const state = await customClient.initializeGuildState(interaction.guildId);
    const roleMapper = state.roleMapper;

    try {
      const member = await interaction.guild.members.fetch(user.id);
      if (!member) return '';

      const role = roleMapper.getRole(targetServer.RoleName);

      if (!role) {
        console.error(`Role not found: ${targetServer.RoleName}`);
        return `\n(Warning: Role "${targetServer.RoleName}" not found)`;
      }

      if (operation === 'add') {
        await member.roles.add(role);
      } else if (operation === 'remove') {
        await member.roles.remove(role);
      }
      return '';
    } catch (roleError) {
      console.error(`Failed to ${operation} role:`, roleError);
      return `\n(Warning: Failed to ${operation === 'add' ? 'assign' : 'remove'} role: ${targetServer.RoleName})`;
    }
  }

  private async executeWhitelistCommand(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    serverName: string,
    operation: string,
    ign: string,
    user: User,
  ) {
    if (!interaction.guildId) return interaction.editReply('Guild not found.');
    const customClient = interaction.client as CustomClient;
    const state = await customClient.initializeGuildState(interaction.guildId);
    const amp = state.amp;
    const serversCache = state.servers;

    try {
      await amp.login();

      const targetServer = serversCache.get(serverName);
      if (!targetServer) return interaction.editReply('Server not found.');

      const command = `whitelist ${operation} ${ign}`;
      const startTime = Date.now();

      await amp.sendConsoleMessage(targetServer, command);

      const entry = await this.findWhitelistResultEntry(
        amp,
        targetServer.InstanceID,
        ign,
        startTime,
      );

      if (!entry) {
        return interaction.editReply(
          `**${serverName}** (Executed by: ${interaction.user.tag}): Failed to find whitelist result in logs.`,
        );
      }

      let responseText = this.getWhitelistResponseText(entry.Contents, ign, operation);

      /** Role assignment warning (if applicable) */
      const roleWarning = await this.updateUserRole(interaction, user, targetServer, operation);
      responseText += roleWarning;

      /** Successful outcome discord message */
      await interaction.editReply(
        `**${serverName}** (Executed by: ${interaction.user.tag}): ${responseText}`,
      );
    } catch (e) {
      logger.error('Error sending whitelist command:', e);
      await interaction.editReply(
        `**${serverName}** (Executed by: ${interaction.user.tag}): Error sending command.`,
      );
    }
  }

  private async findWhitelistResultEntry(
    amp: GuildState['amp'],
    instanceId: string,
    ign: string,
    startTime: number,
  ): Promise<{ Timestamp: string; Contents: string } | undefined> {
    const seenEntries = new Set<string>();

    for (
      let elapsed = 0;
      elapsed <= Whitelist.maxWaitMs;
      elapsed += Whitelist.pollIntervalMs
    ) {
      const updatesRaw = await amp.getUpdates(instanceId);
      const updates = JSON.parse(updatesRaw) as { ConsoleEntries?: Array<{ Timestamp: string; Contents: string }> };
      const consoleEntries = updates.ConsoleEntries || [];

      const entry = consoleEntries.find((consoleEntry) =>
        this.isMatchingWhitelistEntry(consoleEntry, ign, startTime, seenEntries),
      );

      if (entry) return entry;
      await Whitelist.wait(Whitelist.pollIntervalMs);
    }

    return undefined;
  }

  private isMatchingWhitelistEntry(
    entry: { Timestamp: string; Contents: string },
    ign: string,
    startTime: number,
    seenEntries: Set<string>,
  ): boolean {
    const key = `${entry.Timestamp}-${entry.Contents}`;
    if (seenEntries.has(key)) return false;
    seenEntries.add(key);

    const matchesMessage =
      entry.Contents.includes(`Added ${ign} to the whitelist`) ||
      entry.Contents.includes(`Removed ${ign} from the whitelist`) ||
      Whitelist.whitelistResultPhrases.some((phrase) => entry.Contents.includes(phrase));

    if (!matchesMessage) return false;
    return new Date(entry.Timestamp).getTime() >= startTime - 2000;
  }

  private getWhitelistResponseText(entryContents: string, ign: string, operation: string): string {
    if (
      entryContents.includes('to the whitelist') ||
      entryContents.includes('from the whitelist')
    ) {
      return `${ign} was ${operation === 'add' ? 'added to' : 'removed from'} the whitelist.`;
    }

    if (entryContents.includes('already whitelisted')) return `${ign} is already whitelisted.`;
    if (entryContents.includes('is not whitelisted')) return `${ign} is not whitelisted.`;
    if (entryContents.includes('does not exist')) return `${ign} does not exist.`;
    return 'Whitelist command executed.';
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }
}
