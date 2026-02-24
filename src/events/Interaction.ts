import { Events, Interaction, ButtonInteraction, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import CustomClient from '../CustomClient';
import { config } from '../Config';
import logger from '../utility/Logger';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    /** Restrict the bot to a single configured guild only */
    if (!interaction.guildId || interaction.guildId !== config.GUILD_ID) {
      if (interaction.isRepliable()) {
        try {
          await interaction.reply({
            content: 'This bot is restricted to a specific server and cannot be used here.',
            flags: [MessageFlags.Ephemeral],
          });
        } catch (_) {
          /** ignore reply errors (e.g., already replied) */
        }
      }
      return;
    }

    /** Handle button interactions */
    if (interaction.isButton()) {
      const btn = interaction as ButtonInteraction;
      const cid = btn.customId || '';

      /** Handle Pack Update messages (global/hardcoded) */
      if (cid.startsWith('packupdate:complete')) {
        try {
          await btn.deferUpdate();
          await btn.message.delete();
          logger.updates(`[PackUpdate] Completed clicked by ${btn.user.tag}; message deleted.`);
        } catch (err: any) {
          logger.warn(`[PackUpdate] Failed to delete pack update message: ${err?.message ?? err}`);
          try {
            await btn.followUp({ content: 'Unable to delete this message (missing permissions or it is too old).', flags: [MessageFlags.Ephemeral] });
          } catch (_) {}
        }
        return;
      }

      /** Delegate to commands that have a handleButton method */
      const customClient = interaction.client as CustomClient;
      for (const command of customClient.commands.values()) {
        if (command.handleButton) {
          await command.handleButton(btn);
          if (btn.replied || btn.deferred) return;
        }
      }

      /** Unknown button: ignore */
      return;
    }

    /** Handle modal submissions */
    if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      const customClient = interaction.client as CustomClient;
      for (const command of customClient.commands.values()) {
        if (command.handleModal) {
          await command.handleModal(modal);
          if (modal.replied || modal.deferred) return;
        }
      }
      return;
    }

    /** Slash command handling */
    if (!interaction.isChatInputCommand()) return;

    const customClient = interaction.client as CustomClient;
    const command = customClient.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const reply = {
        content: 'There was an error while executing this command!',
        flags: [MessageFlags.Ephemeral],
      } as const;
      interaction.replied || interaction.deferred
        ? await interaction.followUp(reply)
        : await interaction.reply(reply);
    }
  },
};
