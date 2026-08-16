import type { Instance } from "../../types/Instance.js";
import logger from "../../utility/Logger.js";
import { AmpModule } from "../AmpModule.js";

class FileManager extends AmpModule {
  async readFileChunk(instanceId: string, filename: string, offset: number = 0): Promise<any> {
    const json = {
      Filename: filename,
      offset: offset,
    };
    return await this.client.sendPostRequest(
      `${this.client.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/FileManagerPlugin/ReadFileChunk`,
      json,
      this.client.getSessionId(instanceId),
    );
  }

  /** Populates the server cache with the latest server info. */
  async readPackInfoFile(servers: Instance[]): Promise<Instance[]> {
    await this.client.ensureAuthenticated();

    // Concurrency limiter (small cap to keep responsiveness and avoid rate spikes)
    const concurrency = 5;
    let index = 0;
    const tasks: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      const i = index++;
      if (i >= servers.length) return;
      const server = servers[i];

      // Early filters to avoid unnecessary logins and calls
      if (
        server.FriendlyName.includes(`Schedule`) ||
        server.FriendlyName.includes(`Bot`) ||
        server.FriendlyName.includes(`ADS`) ||
        server.Suspended ||
        server.Hidden
      ) {
        return runNext();
      }

      try {
        await this.client.ensureAuthenticated(server.InstanceID);

        const response = await this.readFileChunk(server.InstanceID, 'packInfo.json');

        if (response.Result !== null && response.Result !== undefined) {
          try {
            const decoded = Buffer.from(response.Result, 'base64').toString('utf8');
            const temp = JSON.parse(decoded);
            server.FTCIP = temp.IP;
            server.FTCVersion = temp.Version;
            server.Hidden = temp.Hidden;
            server.PackName = temp.PackName;
            server.CurseForgeURL = temp.CurseForgeURL;
            server.RoleName = temp.RoleName;
          } catch (error) {
            /** @ts-ignore */
            logger.error(error);
          }
        }

        const configJson = {
          SettingNode: 'Game',
          node: 'MinecraftModule.Game.Whitelist',
        };

        const configResponse = await this.client.sendPostRequest(
          `${this.client.API_BASE_URL}API/ADSModule/Servers/${server.InstanceID}/API/Core/GetConfig`,
          configJson,
          this.client.getSessionId(server.InstanceID),
        );

        server.Whitelisted = configResponse?.CurrentValue ?? false;
      } catch (e) {
        /** @ts-ignore */
        logger.error(e);
      } finally {
        // Start another task in the pool
        if (index < servers.length) {
          await runNext();
        }
      }
    };

    for (let i = 0; i < Math.min(concurrency, servers.length); i++) {
      tasks.push(runNext());
    }
    await Promise.all(tasks);

    return servers;
  }
}

export default FileManager;

