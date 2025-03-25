import dotenv from "dotenv";

dotenv.config();

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, AMP_USERNAME, AMP_PASS } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID || !AMP_USERNAME || !AMP_PASS) {
    throw new Error("Missing environment variables");
}

export const config = {
    DISCORD_TOKEN,
    CLIENT_ID,
    GUILD_ID,
    AMP_USERNAME,
    AMP_PASS,
};

