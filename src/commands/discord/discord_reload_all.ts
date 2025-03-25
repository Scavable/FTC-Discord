// Reloads all slash commands

import {SlashCommandBuilder} from "discord.js";

//TODO:Reload all commands from commands folder
module.exports = class ReloadAll {
    static commandName = "discord_reload_all";
    static description = "Reloads all commands";

    async CreateSlashCommand() {
        return new SlashCommandBuilder()
            .setName(ReloadAll.commandName)
            .setDescription(ReloadAll.description);
    }

    CreateCommandFunctionality() {
        return async function execute(interaction: any) {
            try {
                await interaction.deferReply();

                let reloadCount = 0;
                const commandArray = Array.from(interaction.client.commands.values());

                for (const command of commandArray) {
                    if (command.data.name === "discord_reload_all") continue;

                    const commandName = command.data.name;
                    let commandPath = "";
                    console.log(commandName);
                    if(commandName.startsWith("amp")){
                        commandPath = `../amp/${commandName}.ts`;
                        console.log(commandPath);
                    }else if(commandName.startsWith("discord")){
                        commandPath = `../discord/${commandName}.ts`;
                        console.log(commandPath);
                    }else if(commandName.startsWith("minecraft")){
                        commandPath = `../minecraft/${commandName}.ts`;
                        console.log(commandPath);
                    }else
                        continue;

                    //const commandPath = `./${commandName}.ts`;

                    try {
                        delete require.cache[require.resolve(commandPath)];
                        const NewCommand = require(commandPath);
                        const newCommandInstance = new NewCommand();

                        // Ensure CreateObject() is awaited
                        const newCommandObject = await newCommandInstance.CreateObject();

                        if (!newCommandObject || !newCommandObject.data || !newCommandObject.execute) {
                            throw new Error(`Invalid command structure: ${commandName}`);
                        }

                        await interaction.client.commands.set(newCommandObject.data.name, newCommandObject);
                        console.log(`✅ Reloaded command: ${newCommandObject.data.name}`);

                        reloadCount++;
                    } catch (error) {
                        console.error(`❌ Error reloading command ${commandName}:`, error);
                        await interaction.followUp(`❌ Failed to reload \`${commandName}\`: ${error.message}`);
                    }
                }

                await interaction.followUp(`✅ Successfully reloaded ${reloadCount} commands.`);
            } catch (error) {
                console.error("Error in reload_all command:", error);
                await interaction.followUp("❌ An error occurred while reloading commands.");
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
