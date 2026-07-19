import { Events, Interaction, ButtonInteraction, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import CustomClient from '../CustomClient.js';
import { config } from '../Config.js';
import logger from '../utility/Logger.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    /** Restrict the bot to configured guilds only */
    if (!interaction.guildId || !config.GUILD_IDS.includes(interaction.guildId)) {
      if (interaction.isRepliable()) {
        try {
          await interaction.reply({
            content: 'This bot is restricted to specific servers and cannot be used here.',
            flags: [MessageFlags.Ephemeral],
          });
        } catch (_) {
          /** ignore reply errors (e.g., already replied) */
        }
      }
      return;
    }

    const customClient = interaction.client as CustomClient;
    const guildState = await customClient.initializeGuildState(interaction.guildId);

    /** Handle autocomplete */
    if (interaction.isAutocomplete()) {
      const command = customClient.commands.get(interaction.commandName);
      if (interaction.commandName === 'rank' || interaction.commandName === 'whitelist') {
        const focusedValue = interaction.options.getFocused();
        const servers = guildState.servers.getAll().filter(
          (s) =>
            s.Group === "Minecraft" &&
            !["Scheduler", "ADS", "Bot"].some((keyword) =>
              s.FriendlyName.includes(keyword),
            ) &&
            !s.Suspended,
        );
        const filtered = servers.filter((choice) =>
          choice.FriendlyName.toLowerCase().includes(focusedValue.toLowerCase()),
        );
        await interaction.respond(
          filtered.slice(0, 25).map((choice) => ({ name: choice.FriendlyName, value: choice.FriendlyName })),
        );
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

