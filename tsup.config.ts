import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  entry: ['src'],
  splitting: false,
  outDir: 'release/dist',
  format: ['esm'],
  target: 'esnext',
  minify: true,
  clean: true,
  // Copy necessary production files to the specific folder after successful build
  onSuccess: async () => {
    const releaseDir = path.join(process.cwd(), 'release');
    const filesToCopy = [
      'package.json',
      'package-lock.json',
      'LicenseAgreement.md',
    ];

    filesToCopy.forEach((file) => {
      const srcPath = path.join(process.cwd(), file);
      const destPath = path.join(releaseDir, file);

      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to release/${file}`);
      } else {
        console.warn(`Warning: ${file} not found, skipping.`);
      }
    });

    // Create .env.example in release folder instead of copying sensitive .envProd
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const releaseEnvExamplePath = path.join(releaseDir, '.env.example');

    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, releaseEnvExamplePath);
      console.log('Copied .env.example to release/.env.example');
    } else {
      // Generate a basic .env.example if it doesn't exist
      const basicEnv = 'DISCORD_TOKEN=\nCLIENT_ID=\nGUILD_ID=\n';
      fs.writeFileSync(releaseEnvExamplePath, basicEnv);
      console.log('Generated basic .env.example in release folder');
    }
  },
});
