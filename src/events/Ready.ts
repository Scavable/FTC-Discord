import { Events } from 'discord.js';

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: { user: { tag: any } }) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};
