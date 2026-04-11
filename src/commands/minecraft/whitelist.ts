import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  MessageFlags,
  User,
  Guild,
} from 'discord.js';
import Instance from '../../types/Instance';
import CustomClient from '../../CustomClient';
import { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand';
import Servers from '../../utility/Servers';
import RoleMapper from '../../utility/RoleMapper';
import logger from '../../utility/Logger';

export default class Whitelist implements BaseCommand {
  enabled: boolean = true;
  static commandName: string = 'whitelist';
  static commandDescription: string = 'Add a player to the whitelist';

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

  private getAvailableServers(serversCache?: Servers): Instance[] {
    if (!serversCache) return [];
    return serversCache.getAll().filter(
      (s) =>
        s.Group === 'Minecraft' &&
        !['Scheduler', 'ADS', 'Bot'].some((keyword) =>
          s.FriendlyName.includes(keyword),
        ) &&
        !s.Suspended,
    );
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

      /** Wait for 2 seconds to allow the command to process and appear in logs */
      setTimeout(async () => {
        try {
          const updatesRaw = await amp.getUpdates(targetServer.InstanceID);
          const updates = JSON.parse(updatesRaw);
          const consoleEntries = updates.ConsoleEntries || [];

          /** */
          const entry = consoleEntries.find(
            (e: any) =>
              new Date(e.Timestamp).getTime() >= startTime - 6000 &&
              (e.Contents.includes(`${ign} to the whitelist`) ||
                e.Contents.includes(`${ign} from the whitelist`) ||
                e.Contents.includes(`Player is already whitelisted`) ||
                e.Contents.includes(`Player is not whitelisted`) ||
                e.Contents.includes(`That player does not exist`)),
          );

          if (!entry) {
            return interaction.editReply(
              `**${serverName}** (Executed by: ${interaction.user.tag}): Failed to find whitelist result in logs.`,
            );
          }

          console.log(entry.Contents);

          let responseText = '';
          switch (true) {
            case entry.Contents.includes('to the whitelist') ||
              entry.Contents.includes(`from the whitelist`):
              responseText = `${ign} was ${operation === 'add' ? 'added to' : 'removed from'} the whitelist.`;
              break;
            case entry.Contents.includes('already whitelisted'):
              responseText = `${ign} is already whitelisted.`;
              break;
            case entry.Contents.includes('is not whitelisted'):
              responseText = `${ign} is not whitelisted.`;
              break;
            case entry.Contents.includes('does not exist'):
              responseText = `${ign} does not exist.`;
              break;
          }

          /** Role assignment warning (if applicable) */
          const roleWarning = await this.updateUserRole(
            interaction,
            user,
            targetServer,
            operation,
          );
          responseText += roleWarning;

          /** Successful outcome discord message */
          await interaction.editReply(
            `**${serverName}** (Executed by: ${interaction.user.tag}): ${responseText}`,
          );
        } catch (e) {
          logger.error('Error confirming whitelist result:', e);
          await interaction.editReply(
            `**${serverName}** (Executed by: ${interaction.user.tag}): Failed to confirm result from logs.`,
          );
        }
      }, 2000);
    } catch (e) {
      logger.error('Error sending whitelist command:', e);
      await interaction.editReply(
        `**${serverName}** (Executed by: ${interaction.user.tag}): Error sending command.`,
      );
    }
  }

  /** Whitelist command button handler*/
  async handleButton(interaction: ButtonInteraction): Promise<any> {
    const [action, ...args] = interaction.customId.split(':');

    if (action === 'whitelist') {
      if (!interaction.guildId) return;
      const customClient = interaction.client as CustomClient;
      const state = await customClient.initializeGuildState(interaction.guildId);
      const serversCache = state.servers;

      const availableServers = this.getAvailableServers(serversCache);
      if (!availableServers.length) {
        return interaction.reply({
          content: 'No servers available.',
          flags: [MessageFlags.Ephemeral],
        });
      }

      const buttons = availableServers.map((s) =>
        new ButtonBuilder()
          .setCustomId(`whitelist_server:${s.FriendlyName}`)
          .setLabel(s.FriendlyName)
          .setStyle(ButtonStyle.Secondary),
      );

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            buttons.slice(i, i + 5),
          ),
        );
      }
      return interaction.reply({
        content: 'Select server:',
        components: rows,
        flags: [MessageFlags.Ephemeral],
      });
    }

    if (action === 'whitelist_server') {
      const [serverName] = args;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`whitelist_op:${serverName}:add`)
          .setLabel('Add')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`whitelist_op:${serverName}:remove`)
          .setLabel('Remove')
          .setStyle(ButtonStyle.Danger),
      );
      return interaction.update({
        content: `Server: **${serverName}**`,
        components: [row],
      });
    }

    if (action === 'whitelist_op') {
      const [serverName, operation] = args;
      const modal = new ModalBuilder()
        .setCustomId(`whitelist_modal:${serverName}:${operation}`)
        .setTitle(`Whitelist ${operation}`);
      const input = new TextInputBuilder()
        .setCustomId('ign')
        .setLabel('IGN')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(input),
      );
      await interaction.showModal(modal);
    }
  }

  async handleModal(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith('whitelist_modal:')) return;

    const [, server, op] = interaction.customId.split(':');
    await interaction.deferReply();
    const ign = interaction.fields.getTextInputValue('ign');
    await this.executeWhitelistCommand(
      interaction,
      server,
      op,
      ign,
      interaction.user,
    );
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
      handleButton: this.handleButton.bind(this),
      handleModal: this.handleModal.bind(this),
    };
  }
}
