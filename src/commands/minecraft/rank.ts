import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { BaseCommand, CommandObject, SlashCommandData } from "../../interface/BaseCommand";
import Instance from "../../types/Instance";
import Servers from "../../utility/Servers";
import logger from "../../utility/Logger";
import fs from "fs";

export default class Rank implements BaseCommand {
  enabled: boolean = true;
  commandName: string = "rank";
  commandDescription: string = "Add or Remove player rank in the server";

  async createSlashCommand(): Promise<SlashCommandData> {
    const serverChoices = this.getAvailableServers().map((server) => ({
      name: server.FriendlyName,
      value: server.FriendlyName,
    }));

    const ranks = this.getRankChoices();

    const builder = new SlashCommandBuilder()
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
          .setName("option")
          .setDescription("Add or remove")
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
          )
          .setRequired(true),
      );

    if (ranks.length > 0) {
      builder.addStringOption((option) =>
        option
          .setName("rank")
          .setDescription("Rank to add or remove")
          .addChoices(...ranks)
          .setRequired(true),
      );
    }

    if (serverChoices.length > 0) {
      builder.addStringOption((option) =>
        option
          .setName("server")
          .setDescription("Server to add or remove rank")
          .addChoices(...serverChoices)
          .setRequired(true),
      );
    }

    return builder;
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async (interaction: ChatInputCommandInteraction) => {
      //TODO: Implement this command and update instance type to include server chat channel
      await interaction.reply("This command is not yet implemented.");


    }
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }

  private getAvailableServers(): Instance[] {
    return Array.from(Servers.getMap().values()).filter(
      (s) =>
        !["Scheduler", "ADS", "Bot"].some((keyword) =>
          s.FriendlyName.includes(keyword),
        ) && !s.Suspended,
    );
  }

  private getRankChoices(): { name: string; value: string }[] {
    try {
      const data = fs.readFileSync("./ranks.json", "utf8");
      const ranks = JSON.parse(data);
      if (!ranks.names || !Array.isArray(ranks.names)) {
        return [];
      }
      return ranks.names.map((rank: string) => ({ name: rank, value: rank }));
    } catch (err) {
      logger.error("Error reading ranks json file:", err);
      return [];
    }
  }
}
