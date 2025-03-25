import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from "discord.js";

module.exports = class PingCommand {
    static commandName = "ping";
    static commandDescription = "Replies with Pong!";

    async CreateSlashCommand(){
        return new SlashCommandBuilder()
            .setName(PingCommand.commandName)
            .setDescription(PingCommand.commandDescription);

    }
    CreateCommandFunctionality(){
        return async function execute(interaction: CommandInteraction){

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Some title')
                .setURL('https://discord.js.org/')
                .setAuthor({ name: 'Some name', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
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

