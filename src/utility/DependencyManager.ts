import { exec, execSync } from 'child_process';
import logger from './Logger';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { config } from '../Config';
import { promisify } from 'util';

const execAsync = promisify(exec);

class DependencyManager {
  private packageJsonPath: string;

  constructor() {
    this.packageJsonPath = path.resolve(process.cwd(), 'package.json');
  }

  public async verifyDependencies(): Promise<void> {
    if (!existsSync(this.packageJsonPath)) {
      logger.warn('package.json not found. Skipping dependency verification.');
      return;
    }

    try {
      await this.checkNodeVersion();

      const packageJsonContent = await fs.readFile(this.packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      let needsInstall = false;

      logger.info('Verifying dependencies...');

      /** Basic check: is everything in node_modules? */
      for (const dep in dependencies) {
        const depPath = path.resolve(process.cwd(), 'node_modules', dep);
        if (!existsSync(depPath)) {
          logger.warn(`Missing dependency: ${dep}`);
          needsInstall = true;
          break; 
        }
      }

      /**
       * If everything seems present, check if everything is up-to-date with package.json
       * Running 'npm install' when everything is present usually takes just a few seconds 
       * because it checks the lockfile. 
       * To satisfy "update any versions outside the limit", we can just run it.
       */
      
      if (needsInstall) {
        await this.installDependencies();
      } else {
        logger.info('All dependencies seem to be present.');
        if (config.AUTO_UPDATE_DEPS && !config.IS_PROD) {
          await this.updateIfOutdated();
        } else if (config.AUTO_UPDATE_DEPS && config.IS_PROD) {
          logger.info('AUTO_UPDATE_DEPS is enabled, but suppressed because environment is set to production.');
        }
      }
    } catch (error) {
      logger.error('Error during dependency verification:', error);
    }
  }

  private async installDependencies(): Promise<void> {
    logger.info('Attempting to install/update dependencies...');
    try {
      await execAsync('npm install --no-audit --no-fund');
      logger.info('Dependencies installed successfully.');
    } catch (error) {
      logger.error('Failed to install dependencies. Please run "npm install" manually.', error);
      process.exit(1);
    }
  }

  private async updateIfOutdated(): Promise<void> {
    logger.info('AUTO_UPDATE_DEPS enabled. Checking for outdated packages...');
    try {
      /**
       * `npm outdated --json` exits with code 1 when outdated packages are found.
       * We need to capture stdout on both success and failure.
       */
      let json = '';
      try {
        const { stdout } = await execAsync('npm outdated --json');
        json = stdout;
      } catch (e: any) {
        /** When outdated packages exist, npm throws with code 1 but still prints JSON to stdout */
        if (e && e.stdout) {
          json = e.stdout.toString();
        } else {
          throw e;
        }
      }

      const data = json ? JSON.parse(json) : {};
      
      const packagesToUpdate = Object.keys(data).filter(pkg => {
        const { current, latest } = data[pkg];
        /**
         * In dev, we can push all the way to 'latest' if we want.
         * The user asked "Is it ideal to keep all deps up to the latest version... only the dev environment"
         * This suggests they WANT latest in dev.
         */
        return current !== latest;
      });

      if (packagesToUpdate.length > 0) {
        logger.info(`Found ${packagesToUpdate.length} package(s) with newer versions available. Updating to latest...`);
        /**
         * To update to 'latest' (ignoring package.json ranges), we use 'npm install pkg@latest' 
         * OR we can just use 'npm install' with a specific flag if available, but
         * 'npm install package@latest' for each is most reliable for "force to latest".
         * However, a simpler way is 'npm install' of the names from the list.
         */
        const names = packagesToUpdate.map(name => `${name}@latest`).join(' ');
        await execAsync(`npm install ${names} --no-audit --no-fund`);
        logger.info('Update to latest complete.');
      } else {
        logger.info('All packages are already at the absolute latest version. No update necessary.');
      }
    } catch (error) {
      logger.warn('Failed to check or update outdated packages automatically. You may run "npm install <pkg>@latest" manually if needed.');
    }
  }

  private async checkNodeVersion(): Promise<void> {
    try {
      const currentVersion = process.version;
      /**
       * Fetch latest LTS or current from registry (simplistic approach: use npm view node version)
       * Actually 'npm view node version' might not be what we want. 
       * Using a quick web check or just notifying if they are behind a known stable version.
       * Better: Use `npm view node versions --json` and pick the last one.
       */
      const { stdout } = await execAsync('npm view node versions --json');
      const versions = JSON.parse(stdout);
      const latestVersion = `v${versions[versions.length - 1]}`;

      if (currentVersion !== latestVersion) {
        logger.warn(`Node.js update available: ${currentVersion} -> ${latestVersion}`);
        logger.warn('To update Node.js, please visit https://nodejs.org/ or use your version manager (nvm, n, etc.)');
      } else {
        logger.info(`Node.js is up to date (${currentVersion}).`);
      }
    } catch (error) {
      /** Ignore errors in node version check to not block startup */
    }
  }
}

export default new DependencyManager();
