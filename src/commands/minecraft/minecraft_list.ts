import {SlashCommandBuilder} from "discord.js";

export default class List{
    static commandName = 'minecraft_list';
    static description = 'List all players on the server';

    async createSlashCommand(){
        return new SlashCommandBuilder()
            .setName(List.commandName)
            .setDescription(List.description);
    }

    createCommandFunctionality(){
        return async function execute(interaction: any){
            await interaction.deferReply();
            await interaction.editReply('List all players on the server');
        }
    }

    async createObject(){
        return {
            data: await this.createSlashCommand(),
            execute: this.createCommandFunctionality(),
        };
    }
}