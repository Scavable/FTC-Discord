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
- [Deployment](#deployment)
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

## Deployment & Production Updates

### 1. Build and Deploy from Local Machine
To build the optimized production package and push it to the remote `production` branch:
```bash
npm run deploy:prod
```
This runs `deploy.ps1`, which builds the bundle with `tsup`, isolates production dependencies in `release/`, mirrors worker scripts, and pushes the release subtree to the `production` branch.

---

### 2. Updating the Production Server

When updating an existing production bot instance, choose one of the procedures below:

#### Method A: In-Place Git Update (Recommended)
This method minimizes downtime and preserves your existing `.env` file on the server:

```bash
# 1. Navigate to the bot directory
cd /path/to/ftc-discord

# 2. Stop the running bot instance (e.g. PM2 or systemd)
pm2 stop ftc-discord
# or: systemctl stop ftc-discord

# 3. Pull the latest release from the production branch
git fetch origin production
git reset --hard origin/production

# 4. Install production dependencies cleanly (mandatory)
npm ci --omit=dev

# 5. Verify .env is present and has required credentials
# (DISCORD_TOKEN, CURSEFORGE_API_KEY, AMP_*, UPDATE_CHANNEL_ID)

# 6. Start the bot
pm2 start ftc-discord
# or: npm start
```

#### Method B: Clean Directory Refresh (Nuclear Reset)
If you prefer wiping the folder or are resolving Git history conflicts:

```bash
# 1. Back up your existing .env file
cp /path/to/ftc-discord/.env /tmp/ftc-discord.env.bak

# 2. Remove the old directory and clone the production branch
rm -rf /path/to/ftc-discord
git clone -b production <REPO_URL> /path/to/ftc-discord
cd /path/to/ftc-discord

# 3. Restore your .env file
cp /tmp/ftc-discord.env.bak .env

# 4. Install production dependencies
npm ci --omit=dev

# 5. Start the bot
npm start
```

#### Method C: AMP Panel Update Procedure
If your bot runs inside an AMP NodeJS instance:
1. Stop the bot instance in the AMP dashboard.
2. In the AMP File Manager, ensure your `.env` file is safely saved or backed up.
3. If AMP reports git conflict / unrelated history errors, delete all files *except* `.env` and click **Update**.
4. Run `npm ci --omit=dev` via the AMP console / terminal if AMP does not automatically run clean install.
5. Start the bot instance.

---

### Key Operational Rules
- **Node.js Version**: Production host must run Node.js **>= 22.0.0** (`node -v`).
- **Clean Dependency Installs**: Always run `npm ci --omit=dev` after pulling updates.
- **Environment Safety**: Never commit `.env` to git; keep it securely stored on the host.

---

## License

This project is licensed under the **ISC License**. See the [LICENSE](./LicenseAgreement.md) file for details.

---

## Contribution

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

---

*Happy Coding!* 😀
