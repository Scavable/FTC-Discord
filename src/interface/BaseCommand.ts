import {
  ChatInputCommandInteraction,
  InteractionResponse,
  SlashCommandBuilder,
} from 'discord.js';

export interface BaseCommand {
  enabled: boolean;
  commandName?: string;
  commandDescription?: string;

  createSlashCommand(): Promise<SlashCommandBuilder>;
  createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<InteractionResponse>>;
  createObject(): Promise<{
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<InteractionResponse>;
  }>;
}