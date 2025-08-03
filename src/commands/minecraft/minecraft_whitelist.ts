import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder, TimestampStyles
} from 'discord.js';
import ServersFile from '../../utility/ServersFile';
import Amp from '../../amp/Amp';
import Instance from '../../types/Instance';

export default class Whitelist {
  async createSlashCommand() {
    // Load server choices dynamically from servers.json
    const servers = ServersFile.getInstances();

    // Exclude servers and map other names into choices
    const serverChoices = Array.from(servers.values())
          .filter((server: Instance) => !server.FriendlyName.includes('Scheduler')
          && !server.FriendlyName.includes('ADS')
          && !server.FriendlyName.includes('Bot')
          && !server.Suspended)
          .map((server: any) => ({
            name: server.FriendlyName,
            value: server.FriendlyName,
          }));

    return new SlashCommandBuilder()
      .setName('minecraft_whitelist')
      .setDescription('Add a player to the whitelist')
      .addStringOption((option) =>
        option
          .setName('ign')
          .setDescription("The player's IGN")
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('option')
          .setDescription('To add or remove the player from the whitelist')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'Remove', value: 'remove' },
          ),
      )
      .addStringOption(
        (option) =>
          option
            .setName('server')
            .setDescription('The server for the whitelist operation')
            .setRequired(true)
            .addChoices(...serverChoices), // Dynamically add server choices
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
  }

  createSlashCommandFunctionality() {
    return async function execute(interaction: ChatInputCommandInteraction) {
      await interaction.deferReply();
      const option = interaction.options.getString('option');
      const ign = interaction.options.getString('ign');
      const server = interaction.options.getString('server');
      const commandString: string = `whitelist ${option} ${ign}`;
      let time = new Date();

      let amp = Amp.getInstance();
      const servers: Map<string, Instance> = ServersFile.getInstances();
      if(server != null){
        const targetServer = servers.get(server);
        if(!targetServer){
          await interaction.editReply('Server not found');
          return;
        }
        // Send the whitelist command to the target server
        await amp.sendConsoleMessage(targetServer, commandString);

        setTimeout(async () => {
          try{
            const updates = JSON.parse(await amp.getUpdates(targetServer.InstanceID)); // Get all updates for the instance

            if (Array.isArray(updates.ConsoleEntries) && updates.ConsoleEntries.length > 0) {
              // Filter console entries to only include those after the recorded time
              const recentEntries = updates.ConsoleEntries.filter((entry: any) => {
                const entryDate = new Date(entry.Timestamp);
                return entryDate.getTime() > time.getTime() - 9000; // Filter based on timestamp
              });

              // Process the filtered entries
              for (const entry of recentEntries) {

                if (entry.Contents.includes('Player is already whitelisted')) {
                  await interaction.editReply('Player is already whitelisted');
                  return;
                }else if(entry.Contents.includes(`Removed ${ign} from the whitelist`)){
                  await interaction.editReply(`Removed ${ign} from the whitelist`);
                  return;
                }else if(entry.Contents.includes(`Added ${ign} to the whitelist`)){
                  await interaction.editReply(`Added ${ign} to the whitelist`);
                  return;
                }else if(entry.Contents.includes(`Player is not whitelisted`)){
                  await interaction.editReply(`Player is not whitelisted`);
                  return;
                }
              }

              await interaction.editReply(commandString); // Command was successful if no conflicts were found
            } else {
              await interaction.editReply('No recent console entries found.');
            }
          } catch (error) {
            console.error('Error fetching updates:', error);
            await interaction.editReply('Failed to fetch console updates. Please try again.');
          }
        }, 2000);
      } else {
        await interaction.editReply('Server selection is invalid or missing.');
      }
    };
  }

  async createObject() {
    return {
      data: await this.createSlashCommand(),
      execute: this.createSlashCommandFunctionality(),
    };
  }
}
