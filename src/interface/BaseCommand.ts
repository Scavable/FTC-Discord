import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export type SlashCommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface CommandObject {
  data: SlashCommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
  handleButton?: (interaction: ButtonInteraction) => Promise<any>;
  handleModal?: (interaction: ModalSubmitInteraction) => Promise<any>;
}

export interface BaseCommand {
  enabled: boolean;
  commandName?: string;
  commandDescription?: string;

  createSlashCommand(): Promise<SlashCommandData>;
  createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>>;
  createObject(): Promise<CommandObject>;
  handleButton?(interaction: ButtonInteraction): Promise<any>;
  handleModal?(interaction: ModalSubmitInteraction): Promise<any>;
}