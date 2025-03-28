import {
    ActionRow, ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    CommandInteraction, Component,
    EmbedBuilder,
    SlashCommandBuilder
} from "discord.js";
import AMP from "../../amp/amp";

module.exports = class ServersPanel {
    static commandName = "amp_servers_panel";
    static commandDescription = "Display AMP server information";

    async CreateSlashCommand(){
        return new SlashCommandBuilder()
            .setName(ServersPanel.commandName)
            .setDescription(ServersPanel.commandDescription);

    }
    CreateCommandFunctionality(){
        return async function execute(interaction: CommandInteraction){
            await interaction.deferReply();

            const amp = AMP.getInstance();
            const servers = await amp.getServers();
            const test = [];

            let button = new ButtonBuilder()
                .setCustomId("Test1")
                .setLabel("Test2")
                .setStyle(ButtonStyle.Success)

            const row = new ActionRowBuilder()
                .addComponents(button);

            for(const info of servers){
                if(!info.FriendlyName.includes("ADS")){
                    let color = info.AppState === 20 ? Colors.Green : Colors.Red;
                    let status = info.AppState === 20 ? "Online" : "Offline";
                    let maxPlayers = 0;
                    let currentPlayers = 0;
                    if(info.Metrics["Active Users"] !== undefined){
                        currentPlayers = info.Metrics["Active Users"].RawValue;
                        maxPlayers = info.Metrics["Active Users"].MaxValue;
                    }

                    console.log(info.Metrics)
                    console.log(maxPlayers);


                    test.push(new EmbedBuilder()
                        .setColor(color)
                        .setTitle(info.FriendlyName)
                        .setDescription("Server Info")
                        .addFields(
                            {name: "Status", value: status},
                            {name: "Players", value: `There are ${currentPlayers} of ${maxPlayers} online`}
                        ));
                    //console.log(info);
                }
            }

            //const color = AppState === 20 ? "Green" : "Red";

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({name: "Bot"})
                .setTitle(servers[1].FriendlyName)
                .setDescription('Some description here')
                .setThumbnail('https://i.imgur.com/AfFp7pu.png')
                .addFields(
                    { name: 'Regular field title', value: 'Some value here' },
                    { name: '\u200B', value: '\u200B' },
                    { name: 'Inline field title', value: 'Some value here', inline: true },
                    { name: 'Inline field title', value: 'Some value here', inline: true },
                )
                .addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
                .setImage('https://i.imgur.com/AfFp7pu.png')
                .setTimestamp()
                .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

            if(test.length > 10){
                await interaction.reply({embeds: test.slice(0, 9)});
                await interaction.followUp({embeds: test.slice(10)});
            }
            await interaction.editReply({embeds: test});

        }
    }

    async CreateObject(){
        return {
            data: await this.CreateSlashCommand(),
            execute: this.CreateCommandFunctionality()
        }
    }
}
