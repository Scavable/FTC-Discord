import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from "discord.js";
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
            const amp = AMP.getInstance();
            const info = await amp.getInstances();

            const embed = new EmbedBuilder()
                .setColor("Red")
                .setAuthor({ name: 'Bot', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
                .setTitle(info[1].FriendlyName)
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

            await interaction.reply({embeds: [embed]});
        }
    }

    async CreateObject(){
        return {
            data: await this.CreateSlashCommand(),
            execute: this.CreateCommandFunctionality()
        }
    }
}
