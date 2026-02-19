# FTC Discord Bot

A powerful, multipurpose Discord bot built with **TypeScript** and **Discord.js**. Designed for the FTC community, this bot integrates with **AMP (CubeCoders)** for Minecraft server management, provides server automation, and tracks CurseForge modpack updates.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

- **AMP Integration**:
  - Authenticate and interact with AMP-managed Minecraft servers.
  - Fetch server instances, configurations, and real-time statuses.
  - Send commands and manage server consoles programmatically.
- **Discord Automation**:
  - Manage categories, channels, and messages.
  - Role management and cross-platform permission syncing.
  - Interaction-based commands using buttons and modals.
- **Minecraft Utilities**:
  - Whitelist management for Minecraft servers.
  - Dynamic server status and configuration retrieval.
- **Modpack Tracking**:
  - Automated CurseForge modpack update checking.
  - Scheduled daily checks with Discord notifications.
- **Robustness**:
  - Centralized logging with Winston.
  - Configuration validation using Zod.
  - Unit testing with Jest.

---

## Technologies Used

- **Runtime**: [Node.js](https://nodejs.org/) (v22.x recommended)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (v5.8+)
- **Library**: [Discord.js](https://discord.js.org/) (v14.x)
- **Bundler**: [tsup](https://tsup.egoist.dev/)
- **Validation**: [Zod](https://zod.dev/)
- **Logging**: [Winston](https://github.com/winstonjs/winston)
- **Testing**: [Jest](https://jestjs.io/)
- **Tools**: [tsx](https://github.com/privatenumber/tsx) (Development execution)

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v22.19.0 or higher)
- [npm](https://www.npmjs.com/)
- A Discord Bot Token (via [Discord Developer Portal](https://discord.com/developers/applications))
- AMP (CubeCoders) credentials (optional, for Minecraft integration)

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Scavable/FTC-Discord.git
   cd FTC-Discord
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

---

## Configuration

1. Locate the `.envTemplate` file in the root directory.
2. Create a copy of it and rename it to `.env`.
3. Fill in the required fields. Below is a reference of the expected structure:
   ```env
   # Discord Configuration
   DISCORD_TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   GUILD_ID=your_guild_id

   # AMP Configuration
   AMP_USERNAME=your_amp_username
   AMP_PASS=your_amp_password

   # Modpack Updates (Optional)
   UPDATE_CHECK_TIME=17:00
   UPDATE_CHANNEL_ID=your_channel_id
   CURSEFORGE_API_KEY=your_api_key
   ```

---

## Usage

### Development
To run the bot in development mode with hot-reloading:
```bash
npm run dev
```

### Production
1. Build the project:
   ```bash
   npm run build
   ```
2. Start the bot:
   ```bash
   npm start
   ```

### Testing
To run the test suite:
```bash
npm test
```

---

## Project Structure

```text
/src
 ├── amp                 # AMP API integration logic
 ├── commands            # Slash commands (AMP, Discord, Minecraft)
 ├── events              # Discord event handlers (Ready, InteractionCreate, etc.)
 ├── interface           # Interfaces and abstract classes
 ├── packs               # Modpack update checking logic
 ├── types               # TypeScript type definitions
 ├── utility             # Shared utilities (Logging, RoleMapper, etc.)
 ├── validation          # Zod schemas for config/data validation
 ├── Bot.ts              # Entry point
 ├── CustomClient.ts     # Extended Discord Client
 └── Config.ts           # Configuration loader
```

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](./LicenseAgreement.md) file for details.

---

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

---

*Happy Coding!* 😀
