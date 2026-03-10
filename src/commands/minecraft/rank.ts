import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction, InteractionCallbackResponse, BooleanCache, CacheType, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { BaseCommand } from "../../interface/BaseCommand";
import Instance from "../../types/Instance";
import Servers from "../../utility/Servers";

export default class Rank implements BaseCommand {
  enabled: boolean = false;
  commandName: string = "rank";
  commandDescription: string = "Add or Remove player rank in the server";

  createSlashCommand(): Promise<
    SlashCommandBuilder | SlashCommandOptionsOnlyBuilder
  > {
    const serverChoices = this.getAvailableServers().map((server) => ({
      name: server.FriendlyName,
      value: server.FriendlyName,
    }));

    return new SlashCommandBuilder()
      .setName(this.commandName)
      .setDescription(this.commandDescription)
      .addStringOption((option) =>
        option
          .setName("ign")
          .setDescription("Player to add or remove rank")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("rank")
          .setDescription("Rank to add or remove")
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Add", value: "remove" },
          )
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("server")
          .setDescription("Server to add or remove rank")
          .addChoices(...serverChoices)
          .setRequired(true),
      );
  }

  async createCommandFunctionality(): Promise<
    (interaction: ChatInputCommandInteraction) => Promise<InteractionCallbackResponse<BooleanCache<CacheType>>>> {
    return async (interaction: ChatInputCommandInteraction): Promise<InteractionCallbackResponse<BooleanCache<CacheType>>> => {
    //TODO: Implement this command and update instance type to include server chat channel
    await interaction.reply("This command is not yet implemented.");
    }
  }

  createObject(): Promise<{
    data: any;
    execute: (interaction: ChatInputCommandInteraction) => Promise<any>;
  }> {
    throw new Error("Method not implemented.");
  }

  private getAvailableServers(): Instance[] {
    return Array.from(Servers.getMap().values()).filter(
      (s) =>
        !["Scheduler", "ADS", "Bot"].some((keyword) =>
          s.FriendlyName.includes(keyword),
        ) && !s.Suspended,
    );
  }
}
