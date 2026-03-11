import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  PermissionsBitField,
  SlashCommandBuilder,
  ButtonInteraction,
  MessageFlags,
  Message,
  BooleanCache,
  CacheType, InteractionCallbackResponse,
} from 'discord.js';
import { BaseCommand, CommandObject, SlashCommandData } from '../../interface/BaseCommand';
import CustomClient from '../../CustomClient';

export default class CommandButtons implements BaseCommand {
  enabled: boolean = true;
  commandName: string = 'command_console';
  commandDescription: string =
    'Creates a row of buttons which execute commands';

  async createSlashCommand(): Promise<SlashCommandData> {
    return new SlashCommandBuilder()
      .setName(this.commandName)
      .setDescription(this.commandDescription)
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages);
  }

  async createCommandFunctionality(): Promise<
    (
      interaction: ChatInputCommandInteraction,
    ) => Promise<InteractionCallbackResponse<BooleanCache<CacheType>>>
  > {
    return async (interaction: ChatInputCommandInteraction) => {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('reload_all')
          .setLabel('Reload')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('whitelist')
          .setLabel('Whitelist')
          .setStyle(ButtonStyle.Primary),
      );

      return await interaction.reply({
        content: 'Command console:',
        components: [row],
      });
    };
  }

  async handleButton(interaction: ButtonInteraction): Promise<any> {
    if (interaction.customId === 'reload_all') {
      const customClient = interaction.client as CustomClient;
      const command = customClient.commands.get('reload_all');
      if (command) {
        try {
          /**
           * Asserting as any because reload_all's execute expects ChatInputCommandInteraction
           * but only uses methods compatible with ButtonInteraction (deferReply, followUp)
           */
          await command.execute(interaction as any);
        } catch (error) {
          console.error(error);
          await interaction.followUp({
            content: 'There was an error while executing the reload command!',
            flags: [MessageFlags.Ephemeral],
          });
        }
      }
    }
    if (interaction.customId === 'whitelist') {
      const customClient = interaction.client as CustomClient;
      const command = customClient.commands.get('whitelist');
      if (command && command.handleButton) {
        await command.handleButton(interaction);
      }
    }
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
      handleButton: this.handleButton.bind(this),
    };
  }
}