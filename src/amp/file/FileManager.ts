import Instance from '../../types/Instance';
import logger from '../../utility/Logger';
import { AmpModule } from '../AmpModule';

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

    await Promise.all(
      servers.map(async (server) => {
        if (
          server.FriendlyName.includes(`Schedule`) ||
          server.FriendlyName.includes(`Bot`) ||
          server.FriendlyName.includes(`ADS`) ||
          server.Suspended
        )
          return;

        await this.client.ensureAuthenticated(server.InstanceID);

        const response = await this.readFileChunk(server.InstanceID, 'packInfo.json');

        if (response.Result !== null && response.Result !== undefined) {
          try {
            const temp = JSON.parse(atob(response.Result));
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
        
        // Note: This still depends on the client having a core module or a way to get config
        // But since this is specific to this app's logic, we can keep it here or move it to a better place.
        // For now, we'll use a direct API call or keep the dependency on the client.
        // Actually, the original code used `this.getConfig(server)` which was in `Amp.ts`.
        // I'll need to handle the getConfig part too.
        
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
      }),
    );

    return servers;
  }
}

export default FileManager;
