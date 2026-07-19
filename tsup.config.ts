import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";

export default defineConfig((options) => {
  const isProd = process.env.NODE_ENV === "production" && !options.watch;
  const cwd = process.cwd();
  const releaseDir = path.join(cwd, "release");

  return {
    entry: ["src/Bot.ts"],
    platform: "node",
    target: "node22",
    format: ["esm"],
    // Bundle all runtime deps so the server doesn't need to install packages
    noExternal: [
      "discord.js",
      "dotenv",
      "latest",
      "prismarine-nbt",
      "winston",
      "winston-daily-rotate-file",
      "zod",
    ],
    outDir: "release/dist",
    splitting: false,
    dts: false,
    minify: isProd,
    sourcemap: isProd ? false : true,
    clean: true,
    treeshake: true,
    tsconfig: "tsconfig.json",
    env: {
      NODE_ENV: isProd ? "production" : "development",
    },
    // Provide a CommonJS-like require in ESM output to support dynamic require() calls
    banner: {
      js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
    },
    onSuccess: async () => {
      const filesToCopy = [
        "package.json",
        "package-lock.json",
        "LicenseAgreement.md",
        "ranks.json",
      ];
      for (const file of filesToCopy) {
        const src = path.join(cwd, file);
        const dest = path.join(releaseDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} -> release/${file}`);
        }
      }

      // Always provide a template for server reference
      const envTemplate = path.join(cwd, ".envTemplate");
      const envTemplateDest = path.join(releaseDir, ".env.template");
      if (fs.existsSync(envTemplate)) {
        fs.copyFileSync(envTemplate, envTemplateDest);
        console.log("Copied .envTemplate -> release/.env.template");
      }

      // Optional: copy real .env only when explicitly requested (local smoke tests)
      if (process.env.COPY_ENV === "1") {
        const env = path.join(cwd, ".env");
        if (fs.existsSync(env)) {
          fs.copyFileSync(env, path.join(releaseDir, ".env"));
          console.log("Copied .env -> release/.env");
        }
      }
    },
  };
});
