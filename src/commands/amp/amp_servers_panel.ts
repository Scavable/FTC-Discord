import {
    ChannelType,
    Colors,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder
} from "discord.js";
import { setTimeout } from "timers/promises";
import AMP from "../../amp/amp";

module.exports = class ServersPanel {
    static commandName = "amp_servers_panel";
    static commandDescription = "Display AMP server information";

    async CreateSlashCommand() {
        return new SlashCommandBuilder()
            .setName(ServersPanel.commandName)
            .setDescription(ServersPanel.commandDescription)
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild); // Restrict command to users with Manage Guild permission;
    }

    CreateCommandFunctionality() {
        return async function execute(interaction: any) {
            const guild = interaction.guild;
            let channel = guild.channels.cache.find(ch => ch.type === ChannelType.GuildText && ch.name === "server-status");

            if (!channel) {
                channel = await guild.channels.create({ name: "server-status", type: ChannelType.GuildText });
            }

            await interaction.deferReply();
            let count = 0;
            let previousMessages = await channel.messages.fetch({ limit: 100 });

            while (true) {
                const amp = AMP.getInstance();
                const servers = await amp.getServers();
                const embeds = servers
                    .filter((info: any) => !info.FriendlyName.includes("ADS") && info.AppState !== -1)
                    .map((info: any) => {
                        let color = info.AppState === 20 ? Colors.Green : Colors.Red;
                        let status = info.AppState === 20 ? "```diff\n+ Online\n```" : "```diff\n- Offline\n```";
                        let currentPlayers = info.Metrics["Active Users"]?.RawValue || 0;
                        let maxPlayers = info.Metrics["Active Users"]?.MaxValue || 0;
                        return new EmbedBuilder()
                            .setColor(color)
                            .setTitle(info.FriendlyName)
                            .setDescription("Server Info")
                            .addFields(
                                { name: "Status", value: status },
                                { name: "Players", value: `**\`There are ${currentPlayers} of ${maxPlayers} online\`**` }
                            )
                            .setTimestamp();
                    });

                const embedChunks = []; // Split embeds into chunks of 10
                for (let i = 0; i < embeds.length; i += 10) {
                    embedChunks.push(embeds.slice(i, i + 10));
                }

                let messagesArray = [...previousMessages.values()];
                for (let i = 0; i < embedChunks.length; i++) {
                    if (messagesArray[i]) {
                        await messagesArray[i].edit({ embeds: embedChunks[i] });
                    } else {
                        await channel.send({ embeds: embedChunks[i] });
                    }
                }

                // Delete excess messages if there are more messages than needed
                for (let i = embedChunks.length; i < messagesArray.length; i++) {
                    await messagesArray[i].delete();
                }

                previousMessages = await channel.messages.fetch({ limit: 100 });
                if (count < 1) {
                    await interaction.editReply("Command executed successfully.");
                    count = 1;
                }
                await setTimeout(30000);
            }
        };
    }

    async CreateObject() {
        return {
            data: await this.CreateSlashCommand(),
            execute: this.CreateCommandFunctionality()
        };
    }
};
