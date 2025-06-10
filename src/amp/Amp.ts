import Instance from '../types/Instance';
import logger from '../utility/Logger';
import ServersFile from '../utility/ServersFile';

class Amp {
  private static instance: Amp | null = null;
  private readonly API_BASE_URL: string =
    process.env.AMP_API_BASE_URL || 'https://amp.feedthecraft.com/';
  private readonly username: string;
  private readonly password: string;
  private readonly token: string;
  private readonly rememberMe: boolean;

  private baseSessionId: string = '';
  private instanceSessionId: string = '';
  private rememberMeToken: string = '';
  private ID: string = '';
  private instances: Instance[] = [];

  private constructor(
    username: string,
    password: string,
    token = '',
    rememberMe = false,
  ) {
    this.username = username;
    this.password = password;
    this.token = token;
    this.rememberMe = rememberMe;
  }

  public static getInstance(
    username?: string,
    password?: string,
    token = '',
    rememberMe = false,
  ): Amp {
    if (!Amp.instance) {
      if (!username || !password) {
        throw new Error('Amp instance not initialized. Credentials required.');
      }
      Amp.instance = new Amp(username, password, token, rememberMe);
    }
    return Amp.instance;
  }

  private async sendPostRequest(url: string, data: any) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status} - ${response.statusText}`,
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        throw new Error('Invalid response format. Expected JSON.');
      }
    } catch (error: any) {
      throw new Error(`Request to ${url} failed: ${error.message}`);
    }
  }

  private ensureAuthenticated(): void {
    if (!this.baseSessionId) {
      throw new Error('Not authenticated. Please login first.');
    }
  }

  async login(instanceId?: string): Promise<void> {
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
        logger.info(`AMP logged in successfully.`);

        if (instanceId) this.instanceSessionId = response.sessionID;
        else this.baseSessionId = response.sessionID;

        this.rememberMeToken = response.rememberMeToken;
        this.ID = response.userInfo.ID;
      } else {
        console.error('Login failed:', response);
      }
    } catch (error) {
      console.error('Login request failed:', error);
    }
  }

  async getInstances(): Promise<Instance[]> {
    this.ensureAuthenticated();
    const json = { SESSIONID: this.baseSessionId };

    try {
      const response = await this.sendPostRequest(
        `${this.API_BASE_URL}API/ADSModule/GetInstances`,
        json,
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

  async getConfig(server: Instance): Promise<boolean> {
    this.ensureAuthenticated();
    const json = {
      // @ts-ignore
      SettingNode: 'Game',
      SESSIONID: this.instanceSessionId,
      node: 'MinecraftModule.Game.Whitelist',
    };

    const response = await this.sendPostRequest(
      `${this.API_BASE_URL}API/ADSModule/Servers/${server.InstanceID}/API/Core/GetConfig`,
      json,
    );

    return JSON.parse(JSON.stringify(response)).CurrentValue;
  }

  async readFile(servers: Instance[]): Promise<Instance[]> {
    this.ensureAuthenticated();

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
        SESSIONID: this.instanceSessionId,
      };
      const response = await this.sendPostRequest(
        `${this.API_BASE_URL}API/ADSModule/Servers/${server.InstanceID}/API/FileManagerPlugin/ReadFileChunk`,
        json,
      );

      if (response.Result !== null && response.Result !== undefined) {
        const temp = JSON.parse(atob(response.Result));
        server.FTCIP = temp.IP;
        server.FTCVersion = temp.Version;
      }

      server.Whitelisted = await this.getConfig(server);
    }

    const file = process.cwd() + '/servers.json';
    const json = JSON.stringify(servers, null, 2);
    ServersFile.writeFile(file, json);

    return servers;
  }
}

export default Amp;
