import { SlashCommandBuilder } from 'discord.js';

export default class ReloadAll {
    static commandName = 'discord_reload_all';
    static description = 'Reloads all commands';

    async createSlashCommand() {
        return new SlashCommandBuilder()
            .setName(ReloadAll.commandName)
            .setDescription(ReloadAll.description);
    }

    createCommandFunctionality() {
        return async function execute(interaction: any) {
            try {
                await interaction.deferReply();
                let reloadCount = 0;
                const commandArray = Array.from(interaction.client.commands.values());

                for (const command of commandArray) {
                    if (command.data.name === 'discord_reload_all') continue;

                    const commandName = command.data.name;
                    let commandPath = '';

                    if (commandName.startsWith('amp')) {
                        commandPath = `../amp/${commandName}.ts`;
                    } else if (commandName.startsWith('discord')) {
                        commandPath = `../discord/${commandName}.ts`;
                    } else if (commandName.startsWith('minecraft')) {
                        commandPath = `../minecraft/${commandName}.ts`;
                    } else continue;

                    try {
                        const { default: NewCommand } = await import(commandPath + `?update=${Date.now()}`);
                        const newCommandInstance = new NewCommand();
                        const newCommandObject = await newCommandInstance.createObject();

                        if (!newCommandObject?.data?.name || !newCommandObject?.execute) {
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
                console.error('Error in reload_all command:', error);
                await interaction.followUp('❌ An error occurred while reloading commands.');
            }
        };
    }

    async createObject() {
        return {
            data: await this.createSlashCommand(),
            execute: this.createCommandFunctionality(),
        };
    }
}
