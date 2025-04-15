import {
    ChannelType,
    Colors,
    EmbedBuilder,
    PermissionFlagsBits,
    SlashCommandBuilder,
    TextChannel,
    ChatInputCommandInteraction
} from "discord.js";
import { setTimeout } from "timers/promises";
import AMP from "../../amp/amp.js";
import Instance from "../../types/Instance";

export default class ServersPanel {
    static commandName = "amp_servers_panel";
    static commandDescription = "Display AMP server information";

    async createSlashCommand() {
        return new SlashCommandBuilder()
            .setName(ServersPanel.commandName)
            .setDescription(ServersPanel.commandDescription)
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
    }

    createCommandFunctionality() {
        return async function execute(interaction: ChatInputCommandInteraction) {
            const guild = interaction.guild;
            if (!guild) return await interaction.reply("❌ Guild not found.");

            let channel = guild.channels.cache.find(
                ch => ch.type === ChannelType.GuildText && ch.name === "server-status"
            ) as TextChannel;

            if (!channel) {
                channel = await guild.channels.create({
                    name: "server-status",
                    type: ChannelType.GuildText
                }) as TextChannel;
            }

            await interaction.deferReply();
            let hasReplied = false;
            let messageCache: Map<string, any> = new Map();

            const updateServerStatus = async () => {
                try {
                    const amp = AMP.getInstance();
                    const servers = await amp.getServers();
                    if (!servers) return;

                    const embeds = servers
                        .filter((info: Instance) => !info.FriendlyName.includes("ADS") && info.AppState !== -1)
                        .map((info: Instance) => {
                            const color = info.AppState === 20 ? Colors.Green : Colors.Red;
                            const status = info.AppState === 20
                                ? "+ Online"
                                : "- Offline";
                            const currentPlayers = info.Metrics["Active Users"]?.RawValue || 0;
                            const maxPlayers = info.Metrics["Active Users"]?.MaxValue || 0;

                            return new EmbedBuilder()
                                .setColor(color)
                                .setTitle(info.FriendlyName)
                                .addFields({
                                    name: "Status",
                                    value: `\u0060\u0060\u0060diff\n${status}\n\u0060\u0060\u0060`
                                }, {
                                    name: "Players",
                                    value: `\u0060\u0060\u0060\n${currentPlayers} of ${maxPlayers} online\n\u0060\u0060\u0060`
                                })
                                .setTimestamp();
                        });

                    const embedChunks: EmbedBuilder[][] = [];
                    for (let i = 0; i < embeds.length; i += 10) {
                        embedChunks.push(embeds.slice(i, i + 10));
                    }

                    const previousMessages = await channel.messages.fetch({ limit: 100 });
                    const existingMessages = [...previousMessages.values()];

                    for (let i = 0; i < embedChunks.length; i++) {
                        const newContent = JSON.stringify(embedChunks[i].map(embed => embed.toJSON()));

                        if (existingMessages[i]) {
                            const messageId = existingMessages[i].id;
                            if (messageCache.get(messageId) !== newContent) {
                                await existingMessages[i].edit({ embeds: embedChunks[i] });
                                messageCache.set(messageId, newContent);
                            }
                        } else {
                            const sentMessage = await channel.send({ embeds: embedChunks[i] });
                            messageCache.set(sentMessage.id, newContent);
                        }
                    }

                    // Delete all extra messages
                    for (let i = embedChunks.length; i < existingMessages.length; i++) {
                        await existingMessages[i].delete();
                        messageCache.delete(existingMessages[i].id);
                    }

                    if (!hasReplied) {
                        await interaction.editReply("✅ Server status panel started.");
                        hasReplied = true;
                    }

                    await setTimeout(30000);
                    await updateServerStatus();
                } catch (error) {
                    console.error("Error updating server status:", error);
                    await interaction.followUp("❌ Failed to update server status.");
                }
            };

            await updateServerStatus();
        };
    }

    async createObject() {
        return {
            data: await this.createSlashCommand(),
            execute: this.createCommandFunctionality()
        };
    }
}
