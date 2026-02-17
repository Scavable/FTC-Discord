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
  MessagePayload,
  MessageFlags,
} from 'discord.js';
import Instance from '../../types/Instance';
import CustomClient from '../../CustomClient';
import { BaseCommand } from '../../interface/BaseCommand';
import Servers from '../../utility/Servers';
import { string } from 'zod';
import * as assert from 'node:assert';

export default class Whitelist implements BaseCommand {
  enabled: boolean = true;
  static commandName: string = 'whitelist';
  static commandDescription: string = 'Add a player to the whitelist';

  async createSlashCommand() {
    const serverChoices = this.getAvailableServers().map((server) => ({
      name: server.FriendlyName,
      value: server.FriendlyName,
    }));

    return new SlashCommandBuilder()
      .setName(Whitelist.commandName)
      .setDescription(Whitelist.commandDescription)
      .addUserOption((o) => o.setName('user').setDescription('The discord user').setRequired(true))
      .addStringOption((o) => o.setName('ign').setDescription("The player's IGN").setRequired(true))
      .addStringOption((o) =>
        o.setName('option').setDescription('Add or remove').setRequired(true)
          .addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }),
      )
      .addStringOption((o) =>
        o.setName('server').setDescription('The server').setRequired(true).addChoices(...serverChoices),
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<void>> {
    return async (interaction: ChatInputCommandInteraction) => {
      await interaction.deferReply();
      const [ign, option, server] = [
        interaction.options.getString('ign'),
        interaction.options.getString('option'),
        interaction.options.getString('server'),
      ];

      if (ign && option && server) {
        await this.executeWhitelistCommand(interaction, server, option, ign);
      } else {
        await interaction.editReply('Invalid or missing options.');
      }
    };
  }

  async createObject() {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
      handleButton: this.handleButton.bind(this),
      handleModal: this.handleModal.bind(this),
    };
  }

  private getAvailableServers(): Instance[] {
    return Array.from(Servers.getMap().values()).filter(
      (s) => !['Scheduler', 'ADS', 'Bot'].some((keyword) => s.FriendlyName.includes(keyword)) && !s.Suspended,
    );
  }

  private async executeWhitelistCommand(
    interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
    serverName: string,
    operation: string,
    ign: string,
  ) {
    const client = interaction.client as CustomClient;
    client.initializeState();
    const amp = client.getAmpInstance();
    await amp.login();

    if(interaction.guild === null)
      return interaction.editReply('Guild not found.');

    const roles = interaction.guild.roles.cache;

    const targetServer = Servers.get(serverName);
    if (!targetServer) return interaction.editReply('Server not found.');

    console.log(await amp.getUserList(targetServer.InstanceID));

    const command = `whitelist ${operation} ${ign}`;
    const startTime = Date.now();

    try {
      await amp.sendConsoleMessage(targetServer, command);
      setTimeout(async () => {
        try {
          const updates = JSON.parse(await amp.getUpdates(targetServer.InstanceID));
          const entry = (updates.ConsoleEntries || []).find((e: any) =>
            new Date(e.Timestamp).getTime() > startTime - 5000 &&
            (e.Contents.includes('whitelisted') || e.Contents.includes(`from the whitelist`))
          );
          let responseText = entry ? entry.Contents : `${ign} was ${operation === 'add' ? 'added to' : 'removed from'} the whitelist.`;
          if (responseText.includes('Player is already whitelisted')) {
            responseText = responseText.replace('Player', ign);
          }
          await interaction.editReply(`**${serverName}** (Executed by: ${interaction.user.tag}): ${responseText}`);
        } catch (e) {
          await interaction.editReply(`**${serverName}** (Executed by: ${interaction.user.tag}): Failed to confirm result from logs.`);
        }
      }, 2000);
    } catch (e) {
      await interaction.editReply(`**${serverName}** (Executed by: ${interaction.user.tag}): Error sending command.`);
    }
  }

  async handleButton(interaction: ButtonInteraction): Promise<any> {
    const [action, ...args] = interaction.customId.split(':');

    if (action === 'whitelist') {
      const buttons = this.getAvailableServers().map((s) =>
        new ButtonBuilder().setCustomId(`whitelist_server:${s.FriendlyName}`).setLabel(s.FriendlyName).setStyle(ButtonStyle.Secondary),
      );

      if (!buttons.length) return interaction.reply({ content: 'No servers available.', flags: [MessageFlags.Ephemeral] });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 5)));
      }
      return interaction.reply({ content: 'Select server:', components: rows, flags: [MessageFlags.Ephemeral] });
    }

    if (action === 'whitelist_server') {
      const [serverName] = args;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`whitelist_op:${serverName}:add`).setLabel('Add').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`whitelist_op:${serverName}:remove`).setLabel('Remove').setStyle(ButtonStyle.Danger),
      );
      return interaction.update({ content: `Server: **${serverName}**`, components: [row] });
    }

    if (action === 'whitelist_op') {
      const [serverName, operation] = args;
      const modal = new ModalBuilder().setCustomId(`whitelist_modal:${serverName}:${operation}`).setTitle(`Whitelist ${operation}`);
      const input = new TextInputBuilder().setCustomId('ign').setLabel('IGN').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      await interaction.showModal(modal);
    }
  }

  async handleModal(interaction: ModalSubmitInteraction) {
    if (interaction.customId.startsWith('whitelist_modal:')) {
      const [, server, op] = interaction.customId.split(':');
      await interaction.deferReply();
      await this.executeWhitelistCommand(interaction, server, op, interaction.fields.getTextInputValue('ign'));
    }
  }
}
