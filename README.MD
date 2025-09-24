# Discord Bot - TypeScript Project

Welcome to the **Discord Bot** repository! This project is built using **TypeScript** and leverages the **Discord.js** library to interact with Discord's API. This bot is designed to enhance user interactions and provide various functionalities on Discord servers.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [License](#license)

---

## Installation (Needs work)

To get started with this project, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/Scavable/FTC-Discord.git
   cd "FTC Discord"
   ```

2. Install dependencies via npm:

   ```bash
   npm install
   npm install discord.js
   npm install dotenv
   ```

3. Create a `.env` file in the project directory and add your Discord bot token:

   ```
   # Discord Bot Creds
   DISCORD_TOKEN=
   CLIENT_ID=
   GUILD_ID=
   AMP_USERNAME=
   AMP_PASS=
   ```

4. Compile the TypeScript codebase (optional during development):

   ```bash
   npm run build
   ```

5. Start the bot:

   ```bash
   npm start
   ```

---

## Usage

1. Set up a bot application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Generate an invite link with the required scopes and permissions for the bot.
3. Use the invite link to add the bot to your server.
4. The bot will come online and start responding to commands as defined in the code.

---

## Features

<ul>
   <li> AMP Integration: </li>
<ul>
      <li> Authenticate and interact with AMP-managed Minecraft servers. </li>
      <li> Fetch server instances, configurations, and statuses. </li>
      <li> Send commands and manage server console messages programmatically. </li>
</ul>
   <li> Discord Bot: </li>
<ul>
      <li> Manage Discord-specific tasks like creating categories, deleting messages or channels, and other server automation functionalities. </li>
      <li> Enable role management and permissions synced across platforms. </li>
</ul>
   <li> Minecraft Features: </li>
<ul>
      <li> Whitelist management for Minecraft servers. </li>
      <li> Retrieval of server configurations and dynamic server updates. </li>
</ul>
   <li> Logging: Centralized logging system for debugging and error tracking. </li>
</ul>

---

## Technology Stack

Backend: Node.js, TypeScript <br>
Frameworks: Discord.js <br>
Configuration: Dotenv <br>
Testing: Jest <br>
Build Tool: Tsup and Tsx <br>
Logging: Winston <br>

<br>

[Node.js] (https://nodejs.org/en) (v22.19.0): Free, open-source, cross-platform JavaScript runtime environment. <br>
[TypeScript] (https://www.typescriptlang.org/) (v5.8.2): A superset of JavaScript that provides optional static typing. <br>
[Discord.js] (https://discord.js.org/) (v14.18.0): A powerful library for building Discord bots. <br>
[dotenv] (https://www.npmjs.com/package/dotenv) (v16.4.7): For environment variable management. <br>
[Jest] (https://jestjs.io/) (v29.5.14): Unit testing framework. <br>
[tsup] (https://www.npmjs.com/package/tsup) (v8.4.0): For bundling and building the application. <br>
[tsx] (https://github.com/esbuild-kit/tsx) (v4.19.3): For TypeScript runtime and execution. <br>
[winston] (https://www.npmjs.com/package/winston) (v3.17.0): A simple and universal logging library with support for multiple transports. <br>

---

## Project Structure

The project follows a clean structure to ensure maintainability and scalability:

<pre>
/src <br>
 ├── amp # Contains AMP-specific API integration logic <br>
 │   └── Amp.ts # Main AMP-related functionality <br>
 ├── commands # Commands for both Discord and Minecraft <br>
 │    ├── amp  # AMP server-related commands <br>
 │    └── discord # Discord-specific commands (e.g., create category) <br>
 │    └── minecraft # Minecraft-specific commands (e.g., whitelist management) <br>
 ├── events              # Discord event handlers <br>
 ├── interface           # Interfaces and abstract command classes <br>
 ├── types               # TypeScript types used in the project <br>
 ├── utility             # Core utility functions (e.g., logging, file operations) <br>
 ├── Config.ts           # Configurations for the project <br>
 ├── Bot.ts              # Main entry for the Discord bot <br>
 ├── CustomClient.ts     # Customized Discord client instance <br>
.env # Environment variables <br>
.envTemplate # Gives all currently used variables without values; Rename to .env <br>
LicenseAgreement.md # License <br>
package.json <br>
README.MD # Readme file for GitHub <br>
tsconfig.json # TypeScript configuration <br>
</pre>
---

## License

This project is licensed under the ISC License. You can find more details in the [LICENSE](./LicenseAgreement.md) file.

---

## Contribution

Have ideas or found issues? Feel free to open a pull request or submit an issue. All contributions are welcome!

---

We hope you find this bot useful! Happy coding! 😀
