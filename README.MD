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

## Installation

To get started with this project, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/Scavable/FTC-Discord.git
   cd discord-bot
   ```

2. Install dependencies via npm:

   ```bash
   npm install
   npm install discord.js
   npm install dotenv
   ```

3. Create a `.env` file in the project directory and add your Discord bot token:

   ```
   DISCORD_TOKEN=your-discord-bot-token-here
   CLIENT_ID=your-cllient-id-here
   GUILD_ID=your-guild-id-here
   AMP_USERNAME=amp-bot-username-here
   AMP_PASS=amp-bot-password-here
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

- Customizable command handling.
- Real-time interaction with Discord servers.
- Easily extensible to meet specific requirements.
- Built-in support for modern TypeScript features.

---

## Technologies Used

- [TypeScript](https://www.typescriptlang.org/) (v5.8.2): A superset of JavaScript that provides optional static typing.
- [Discord.js](https://discord.js.org/) (v14.18.0): A powerful library for building Discord bots.
- [dotenv](https://www.npmjs.com/package/dotenv) (v16.4.7): For environment variable management.
- [tsx](https://github.com/esbuild-kit/tsx) (v4.19.3): For TypeScript runtime and execution.
- [tsup](https://www.npmjs.com/package/tsup) (v8.4.0): For bundling and building the application.

---

## Project Structure

The project follows a clean structure to ensure maintainability and scalability:

/src <br>
&emsp;├── amp/ # Amp functions <br>
&emsp;├── commands/ # Command files go here <br>
&emsp;├── events/ # Event handling files <br>
&emsp;├── types/ # Types <br>
&emsp;├── utility/ # Utility functions and tools <br>
&emsp;├── Bot.ts # Main entry point of the bot <br>
&emsp;.env # Environment variables package.json <br>
&emsp;tsconfig.json # TypeScript configuration

---

## License

This project is licensed under the MIT License. You can find more details in the [LICENSE](./LICENSE) file.

---

## Contribution

Have ideas or found issues? Feel free to open a pull request or submit an issue. All contributions are welcome!

---

We hope you find this bot useful! Happy coding! 😀
