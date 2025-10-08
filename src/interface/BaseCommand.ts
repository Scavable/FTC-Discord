import {
  CacheType,
  ChatInputCommandInteraction,
  InteractionResponse,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface BaseCommand {
  enabled: boolean;
  commandName?: string;
  commandDescription?: string;

  createSlashCommand(): Promise<SlashCommandBuilder | SlashCommandOptionsOnlyBuilder>;
  createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<InteractionResponse | undefined>>;
  createObject(): Promise<{
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<InteractionResponse | undefined>;
  }>;
}