import Instance from '../../types/Instance';
import logger from '../../utility/Logger';
import Servers from '../../utility/Servers';
import Core from '../core/Core';
import FileManager from '../file/FileManager';
import { IAmpClient } from '../AmpModule';

class Amp implements IAmpClient {
  public readonly API_BASE_URL: string =
    process.env.AMP_API_BASE_URL || '';
  private readonly username: string;
  private readonly password: string;
  private readonly token: string;
  private readonly rememberMe: boolean;

  private baseSessionId: string = '';
  private instanceSessionIds: Map<string, string> = new Map();
  private rememberMeToken: string = '';
  private ID: string = '';
  private instances: Instance[] = [];

  // Sub-modules
  public readonly core: Core;
  public readonly fileManager: FileManager;

  constructor(username: string, password: string, token = '', rememberMe = false) {
    this.username = username;
    this.password = password;
    this.token = token;
    this.rememberMe = rememberMe;

    this.core = new Core(this);
    this.fileManager = new FileManager(this);
  }

  /** Gets the session ID for the given instance, or the base session ID if none provided. */
  public getSessionId(instanceId?: string): string {
    return (instanceId ? this.instanceSessionIds.get(instanceId) : this.baseSessionId) || '';
  }

  /** Sends POST requests to the AMP API */
  public async sendPostRequest(url: string, data?: any, SessionID?: string) {
    const doFetch = async (sid?: string) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); /** 15-second timeout for each request */

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sid}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
        clearTimeout(id);
        return res;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    };

    try {
      let response = await doFetch(SessionID);

      /** If unauthorized/forbidden, try to re-login and retry once */
      if (response.status === 401 || response.status === 403) {
        const match = url.match(/Servers\/(.*?)\//);
        const instanceId = match?.[1];
        await this.login(instanceId);
        const refreshedSession = this.getSessionId(instanceId);
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

  /** Checks for current login connection */
  public async ensureAuthenticated(instanceId?: string): Promise<void> {
    if (!instanceId) {
      if (!this.baseSessionId) {
        await this.login();
      }
      return;
    }

    /** Check for instance session */
    if (!this.instanceSessionIds.has(instanceId)) {
      await this.login(instanceId); /** Refresh instance session if not present */
    }
  }

  /** Logs into the AMP container and instances. */
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
          this.instanceSessionIds.set(instanceId, response.sessionID); /** Cache instance session ID */
        } else {
          this.baseSessionId = response.sessionID; /** Cache base session ID */
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

  /** Returns all AMP instances including AMP container */
  public async getInstances(): Promise<Instance[]> {
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

  /** Checks the instance module for the whitelist flag */
  async getConfig(server: Instance): Promise<boolean> {
    await this.ensureAuthenticated();
    return await this.core.getConfig(server.InstanceID);
  }

  /** Sends a string to a console */
  async sendConsoleMessage(instance: Instance, message: string): Promise<void> {
    await this.ensureAuthenticated(instance.InstanceID);
    await this.core.sendConsoleMessage(instance.InstanceID, message);
    logger.info(`Sent console message to ${instance.FriendlyName}: ${message}`);
  }

  async getUpdates(instanceId: string): Promise<string> {
    await this.ensureAuthenticated(instanceId);
    return await this.core.getUpdates(instanceId);
  }

  /** Populates the server cache with the latest server info. */
  async readFile(servers: Instance[]): Promise<Instance[]> {
    return await this.fileManager.readPackInfoFile(servers);
  }

  /** Work in progress for better and more accurate player counts. */
  async getUserList(instanceId: string): Promise<string[]> {
    await this.ensureAuthenticated(instanceId);
    return await this.core.getUserList(instanceId);
  }
}

export default Amp;
