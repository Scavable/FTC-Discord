import { Client, Collection, GatewayIntentBits } from "discord.js";

export default class CustomClient extends Client {
    commands: Collection<string, any>;

    constructor() {
        super({ intents: [GatewayIntentBits.Guilds] });
        this.commands = new Collection();
    }
}
