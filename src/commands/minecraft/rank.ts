import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";
import { BaseCommand, CommandObject, SlashCommandData } from "../../interface/BaseCommand";
import Instance from "../../types/Instance";
import logger from "../../utility/Logger";
import fs from "fs/promises";
import CustomClient from "../../CustomClient";
import Instances from "../../utility/Instances";
import { promisify } from "util";
import Servers from "../../utility/Servers";

const sleep = promisify(setTimeout);

export default class Rank implements BaseCommand {
  enabled: boolean = true;
  commandName: string = "rank";
  commandDescription: string = "Add or Remove player rank in the server";

  async createSlashCommand(): Promise<SlashCommandData> {
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
          .setName("operation")
          .setDescription("Add or remove")
          .addChoices(
            { name: "Add", value: "add" },
            { name: "Remove", value: "remove" },
          )
          .setRequired(true),
      );

    const ranks = await this.getRankChoices();
    if (ranks.length > 0) {
      builder.addStringOption((option) =>
        option
          .setName("rank")
          .setDescription("Rank to add or remove")
          .addChoices(...ranks.slice(0, 25))
          .setRequired(true),
      );
    }

    builder.addStringOption((option) =>
      option
        .setName("server")
        .setDescription("Server to add or remove rank")
        .setAutocomplete(true)
        .setRequired(true),
    );
    
    builder.addBooleanOption((option) =>
      option
        .setName("patreon")
        .setDescription("Add or remove rank to all servers")
        .setRequired(false),
      );

    return builder;
  }

  async createCommandFunctionality(): Promise<(interaction: ChatInputCommandInteraction) => Promise<any>> {
    return async (interaction: ChatInputCommandInteraction) => {

      await interaction.deferReply();

      const ign = interaction.options.getString("ign");
      const operation = interaction.options.getString("operation");
      const rank = interaction.options.getString("rank");
      const server = interaction.options.getString("server");
      const isPatreon = interaction.options.getBoolean("patreon") || false;

      if (!ign || !operation || !rank || !server) {
        await interaction.followUp("Missing required parameters");
        return;
      }

    const client = interaction.client as CustomClient;
    if (!interaction.guildId) return interaction.editReply('Guild not found.');
    const state = await client.initializeGuildState(interaction.guildId);
    const amp = state.amp;
    const serversCache = state.servers;

    try {
      await amp.login();

      const targetServer = serversCache.get(server);
      if (!targetServer) return interaction.editReply('Server not found.');

        const otherOperation = isPatreon ? operation : (operation === "add" ? "remove" : "add");
        const otherServers = this.getAvailableServers(serversCache).filter(s => s.InstanceID !== targetServer.InstanceID);

        const command = `ftbranks ${operation} ${ign} ${rank}`;
        const otherCommand = `ftbranks ${otherOperation} ${ign} ${rank}`;
        const startTime = Date.now();

        await amp.sendConsoleMessage(targetServer, command);

        if(isPatreon || operation === 'add'){
          for (const otherServer of otherServers) {
            try {
              await amp.sendConsoleMessage(otherServer, otherCommand);
            } catch (e: any) {
              logger.error(
                `Error sending rank command for ${ign} to ${otherServer.FriendlyName}: ${e.message}`,
              );
            }
          }
        }

        /** Wait for 2 seconds to allow the command to process and appear in logs */
        await sleep(2000);
        try {
          const updatesRaw = await amp.getUpdates(targetServer.InstanceID);
          const updates = JSON.parse(updatesRaw);
          const consoleEntries = updates.ConsoleEntries || [];

          /** The messages to look for in the console entries*/
          const entry = consoleEntries.find(
            (e: any) =>
              new Date(e.Timestamp).getTime() > startTime - 5000 &&
              (e.Contents.includes('added to rank') ||
                  e.Contents.includes(`removed from rank`) ||
                e.Contents.includes(`unknown rank`) ||
                e.Contents.includes(`does not exist`)
              ));

          let responseText = '';
          if (!entry) {
            responseText = `Command executed, but no response was found in the server logs for ${ign}.`;
          } else {
            console.log(entry.Contents);

            switch (true) {
              case entry.Contents.includes('added to rank') || entry.Contents.includes(`removed from rank`):
                responseText = `${ign} was ${operation === 'add' ? 'added to' : 'removed from'} rank ${rank}.`;
                break;
              case entry.Contents.includes('unknown rank'):
                responseText = `${rank} does not exist or unknown.`;
                break;
              case entry.Contents.includes('does not exist'):
                responseText = `${ign} does not exist.`;
                break;
              default:
                responseText = `An error occurred while processing the rank command for ${ign}.`;
                break;
            }
          }

          await interaction.editReply(
            `**${server}** (Executed by: ${interaction.user.tag}): ${responseText}`,
          );
        } catch (e: any) {
          logger.error(`Error processing rank command for ${ign}: ${e.message}`);
          await interaction.editReply(
            `**${server}** (Executed by: ${interaction.user.tag}): An error occurred while processing the rank command.`,
          );
        }
      } catch (e: any) {
        logger.error(`Error sending rank command for ${ign}: ${e.message}`);
        await interaction.editReply(
          `**${server}** (Executed by: ${interaction.user.tag}): An error occurred while sending the rank command.`,
        );
      }
    }
  }

  async createObject(): Promise<CommandObject> {
    return {
      data: await this.createSlashCommand(),
      execute: await this.createCommandFunctionality(),
    };
  }

  private getAvailableServers(serversCache?: Servers): Instance[] {
    if (!serversCache) return [];
    return serversCache.getAll().filter(
      (s) =>
        s.Group === "Minecraft" &&
        !["Scheduler", "ADS", "Bot"].some((keyword) =>
          s.FriendlyName.includes(keyword),
        ) &&
        !s.Suspended,
    );
  }

  private async getRankChoices(): Promise<{ name: string; value: string }[]> {
    try {
      const data = await fs.readFile("./ranks.json", "utf8");
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
