import type {
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
}

export interface BaseCommand {
  commandName?: string;
  commandDescription?: string;

  createSlashCommand(): Promise<SlashCommandData>;
  createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>>;
  createObject(): Promise<CommandObject>;
}