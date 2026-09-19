import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";

export default defineConfig((options) => {
  const isProd = process.env.NODE_ENV === "production" && !options.watch;
  const cwd = process.cwd();
  const releaseDir = path.join(cwd, "release");
  const releaseDistDir = path.join(releaseDir, "dist");

  return {
    entry: [
      "src/Bot.ts",
      // Include worker script so it is emitted to release/dist and resolvable at runtime
      "src/workers/cf-rank-worker.js",
    ],
    platform: "node",
    target: "node22",
    format: ["esm"],
    // Bundle all runtime deps so the server doesn't need to install packages
    noExternal: [
      "discord.js",
      "dotenv",
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
      // 1. Ensure release directory exists
      if (!fs.existsSync(releaseDir)) {
        fs.mkdirSync(releaseDir, { recursive: true });
      }

      // 2. Mirror worker script location to support both relative paths (./cf-rank-worker.js and ./workers/cf-rank-worker.js)
      const nestedWorker = path.join(releaseDistDir, "workers", "cf-rank-worker.js");
      const flatWorker = path.join(releaseDistDir, "cf-rank-worker.js");
      if (fs.existsSync(nestedWorker) && !fs.existsSync(flatWorker)) {
        fs.copyFileSync(nestedWorker, flatWorker);
        console.log("Mirrored worker -> release/dist/cf-rank-worker.js");
      } else if (fs.existsSync(flatWorker) && !fs.existsSync(nestedWorker)) {
        fs.mkdirSync(path.join(releaseDistDir, "workers"), { recursive: true });
        fs.copyFileSync(flatWorker, nestedWorker);
        console.log("Mirrored worker -> release/dist/workers/cf-rank-worker.js");
      }

      // 3. Generate a clean production package.json
      const rootPkgPath = path.join(cwd, "package.json");
      if (fs.existsSync(rootPkgPath)) {
        const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
        const prodPkg = {
          name: rootPkg.name,
          version: rootPkg.version,
          private: rootPkg.private,
          type: "module",
          description: rootPkg.description,
          engines: rootPkg.engines,
          main: "dist/Bot.js",
          scripts: {
            start: "node dist/Bot.js",
            "start:prod": "node dist/Bot.js",
          },
          dependencies: rootPkg.dependencies,
          author: rootPkg.author,
          license: rootPkg.license,
        };
        fs.writeFileSync(
          path.join(releaseDir, "package.json"),
          JSON.stringify(prodPkg, null, 2) + "\n",
          "utf8"
        );
        console.log("Generated production package.json -> release/package.json");
      }

      // 4. Copy standalone required files
      const staticFiles = [
        "package-lock.json",
        "LicenseAgreement.md",
        "ranks.json",
        "README.MD",
        "server information.txt",
      ];
      for (const file of staticFiles) {
        const src = path.join(cwd, file);
        const dest = path.join(releaseDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          console.log(`Copied ${file} -> release/${file}`);
        }
      }

      // 5. Always provide .env.template for server reference
      const envTemplate = path.join(cwd, ".envTemplate");
      const envTemplateDest = path.join(releaseDir, ".env.template");
      if (fs.existsSync(envTemplate)) {
        fs.copyFileSync(envTemplate, envTemplateDest);
        console.log("Copied .envTemplate -> release/.env.template");
      }

      // 6. Optional: copy real .env only when explicitly requested (local testing)
      if (process.env.COPY_ENV === "1") {
        const env = path.join(cwd, ".env");
        if (fs.existsSync(env)) {
          fs.copyFileSync(env, path.join(releaseDir, ".env"));
          console.log("Copied .env -> release/.env (COPY_ENV=1)");
        }
      }
    },
  };
});
