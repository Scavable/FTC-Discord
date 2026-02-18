import {
  BooleanCache,
  ButtonInteraction,
  CacheType,
  ChatInputCommandInteraction,
  InteractionCallbackResponse,
  InteractionResponse, Message,
  ModalSubmitInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';

export interface BaseCommand {
  enabled: boolean;
  commandName?: string;
  commandDescription?: string;

  createSlashCommand(): Promise<
    SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
  >;
  createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<InteractionCallbackResponse<BooleanCache<CacheType>>>>;
  createObject(): Promise<{
    data: any;
    execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
    handleButton?: (interaction: ButtonInteraction) => Promise<any>;
    handleModal?: (interaction: ModalSubmitInteraction) => Promise<any>;
  }>;
  handleButton?(interaction: ButtonInteraction): Promise<any>;
  handleModal?(interaction: ModalSubmitInteraction): Promise<any>;
}