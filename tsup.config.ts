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

    // Handle .env.template in release folder for manual reference
    const envTemplatePath = path.join(process.cwd(), '.envTemplate');
    const releaseEnvTemplatePath = path.join(releaseDir, '.env.template');

    if (fs.existsSync(envTemplatePath)) {
      // Always provide a template for manual reference on the server
      fs.copyFileSync(envTemplatePath, releaseEnvTemplatePath);
      console.log('Copied .envTemplate to release/.env.template');
    }

    // Copy .env to release folder for testing
    const envPath = path.join(process.cwd(), '.env');
    const releaseEnvPath = path.join(releaseDir, '.env');

    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, releaseEnvPath);
      console.log('Copied .env to release/.env');
    }
  },
});
