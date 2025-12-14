import Instance from '../types/Instance';
import logger from '../utility/Logger';
import Servers from '../utility/Servers';

class Amp {
  private readonly API_BASE_URL: string =
    process.env.AMP_API_BASE_URL || 'https://amp.feedthecraft.com/';
  private readonly username: string;
  private readonly password: string;
  private readonly token: string;
  private readonly rememberMe: boolean;

  private baseSessionId: string = '';
  private instanceSessionIds: Map<string, string> = new Map();
  private rememberMeToken: string = '';
  private ID: string = '';
  private instances: Instance[] = [];

  constructor(username: string, password: string, token = '', rememberMe = false) {
    this.username = username;
    this.password = password;
    this.token = token;
    this.rememberMe = rememberMe;
  }

  // Sends POST requests to the AMP API
  private async sendPostRequest(url: string, data?: any, SessionID?: string) {
    const doFetch = async (sid?: string) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sid}`,
        },
        body: JSON.stringify(data),
      });
      return response;
    };

    try {
      let response = await doFetch(SessionID);

      // If unauthorized/forbidden, try to re-login and retry once
      if (response.status === 401 || response.status === 403) {
        const match = url.match(/Servers\/(.*?)\//);
        const instanceId = match?.[1];
        await this.login(instanceId);
        const refreshedSession = instanceId
          ? this.instanceSessionIds.get(instanceId)
          : this.baseSessionId;
        response = await doFetch(refreshedSession);
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid response format. Expected JSON.');
      }
      return await response.json();
    } catch (error: any) {
      throw new Error(`Request to ${url} failed: ${error.message}`);
    }
  }

  // Checks for current login connection
  private async ensureAuthenticated(instanceId?: string): Promise<void> {
    if (!instanceId) {
      if (!this.baseSessionId) {
        await this.login();
      }
      return;
    }

    // Check for instance session
    if (!this.instanceSessionIds.has(instanceId)) {
      await this.login(instanceId); // Refresh instance session if not present
    }
  }

  // Logs into the AMP container and instances.
  public async login(instanceId?: string): Promise<void> {
    try {
      const json = {
        username: this.username,
        password: this.password,
        token: this.token,
        rememberMe: this.rememberMe,
      };

      const endpoint = instanceId
        ? `${this.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/Login`
        : `${this.API_BASE_URL}API/Core/Login`;

      const response = await this.sendPostRequest(endpoint, json);

      if (response.success) {
        logger.amp(`AMP logged in successfully.`);

        if (instanceId) {
          this.instanceSessionIds.set(instanceId, response.sessionID); // Cache instance session ID
        } else {
          this.baseSessionId = response.sessionID; // Cache base session ID
        }


        this.rememberMeToken = response.rememberMeToken;
        this.ID = response.userInfo.ID;
      } else {
        console.error('Login failed:', response);
      }
    } catch (error) {
      console.error('Login request failed:', error);
    }
  }

  // Returns all AMP instances including AMP container
  async getInstances(): Promise<Instance[]> {
    await this.ensureAuthenticated();
    const json = { 'ForceIncludeSelf': false };

    try {
      const response = await this.sendPostRequest(
        `${this.API_BASE_URL}API/ADSModule/GetInstances`,
        json,
        this.baseSessionId,
      );

      if (
        !response ||
        !Array.isArray(response) ||
        !response[0]?.AvailableInstances
      ) {
        throw new Error('Invalid response format for GetInstances.');
      }

      this.instances = response[0].AvailableInstances as Instance[];
      return this.instances;
    } catch (error) {
      console.error('Error fetching instances:', error);
      return [];
    }
  }

  //
  async getConfig(server: Instance): Promise<boolean> {
    await this.ensureAuthenticated();
    const json = {
      // @ts-ignore
      SettingNode: 'Game',
      node: 'MinecraftModule.Game.Whitelist',
    };

    const response = await this.sendPostRequest(
      `${this.API_BASE_URL}API/ADSModule/Servers/${server.InstanceID}/API/Core/GetConfig`,
      json,
      this.instanceSessionIds.get(server.InstanceID) || ''
    );

    return JSON.parse(JSON.stringify(response)).CurrentValue;
  }

  // Sends a string to a console
  async sendConsoleMessage(instance: Instance, message: string): Promise<void> {
    await this.ensureAuthenticated(instance.InstanceID);
    const json = {
      message: message,
    };
    await this.sendPostRequest(
      `${this.API_BASE_URL}API/ADSModule/Servers/${instance.InstanceID}/API/Core/SendConsoleMessage`,
      json,
      this.instanceSessionIds.get(instance.InstanceID) || ''
    );
    logger.info(`Sent console message to ${instance.FriendlyName}: ${message}`);
  }

  // Gets changes to the server status, in addition to any notifications or
  // console output that have occurred since the last time GetUpdates() was
  // called by the current session.
  async getUpdates(instanceId: string):Promise<string> {
    await this.ensureAuthenticated(instanceId);
    const json = { };
    const response = await this.sendPostRequest(
      `${this.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/GetUpdates`,
      json,
      this.instanceSessionIds.get(instanceId) || ''
    );
    return JSON.stringify(response);
  }

  async readFile(servers: Instance[]): Promise<Instance[]> {
    await this.ensureAuthenticated();

    for (const server of servers) {
      if (
        server.FriendlyName.includes(`Schedule`) ||
        server.FriendlyName.includes(`Bot`) ||
        server.FriendlyName.includes(`ADS`) ||
        server.Suspended
      )
        continue;

      await this.login(server.InstanceID);

      const json = {
        Filename: `packInfo.json`,
        offset: 0,
      };
      const response = await this.sendPostRequest(
        `${this.API_BASE_URL}API/ADSModule/Servers/${server.InstanceID}/API/FileManagerPlugin/ReadFileChunk`,
        json,
        this.instanceSessionIds.get(server.InstanceID) || ''
      );

      if (response.Result !== null && response.Result !== undefined) {
        try{
          const temp = JSON.parse(atob(response.Result));
          server.FTCIP = temp.IP;
          server.FTCVersion = temp.Version;
          server.Hidden = temp.Hidden;
          server.PackName = temp.PackName;
        }catch(error){
          // @ts-ignore
          logger.error(error);
        }
      }
      server.Whitelisted = await this.getConfig(server);
    }

    // Update cache only; no file persistence
    Servers.setAll(servers);

    return servers;
  }
}

export default Amp;
