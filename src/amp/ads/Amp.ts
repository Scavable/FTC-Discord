import type { Instance } from "../../types/Instance.js";
import logger from '../../utility/Logger.js';
import Core from '../core/Core.js';
import FileManager from '../file/FileManager.js';
import type { IAmpClient } from '../AmpModule.js';
import { KEEP_ALIVE_INITIALIZED } from '../../utility/http.js'; // ensure keep-alive dispatcher is set
import { ampHttpLimit } from '../../utility/limiters.js';

class Amp implements IAmpClient {
  public readonly API_BASE_URL: string =
    process.env.AMP_API_BASE_URL || '';
  private readonly username: string;
  private readonly password: string;
  private readonly token: string;
  private readonly rememberMe: boolean;

  private baseSessionId: string = '';
  private instanceSessionIds: Map<string, string> = new Map();
  private baseLoginInFlight: Promise<void> | null = null;
  private instanceLoginInFlight: Map<string, Promise<void>> = new Map();
  // Removed unused fields (rememberMeToken, ID) as they were never read
  private instances: Instance[] = [];

  // Sub-modules
  public readonly core: Core;
  public readonly fileManager: FileManager;

  constructor(username: string, password: string, token = '', rememberMe = false) {
    this.username = username;
    this.password = password;
    this.token = token;
    this.rememberMe = rememberMe;

    // Touch symbol so bundlers keep the module
    if (!KEEP_ALIVE_INITIALIZED) {
      // no-op
    }
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
        const res = await ampHttpLimit(() => fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sid}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        }));
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
    // Single-flight guard: ensure only one concurrent login per scope (base or instance)
    if (!instanceId) {
      if (this.baseSessionId) return; // already logged in
      if (this.baseLoginInFlight) return this.baseLoginInFlight;
      this.baseLoginInFlight = this._doLogin();
      try {
        await this.baseLoginInFlight;
      } finally {
        this.baseLoginInFlight = null;
      }
      return;
    } else {
      if (this.instanceSessionIds.has(instanceId)) return;
      const existing = this.instanceLoginInFlight.get(instanceId);
      if (existing) return existing;
      const p = this._doLogin(instanceId)
        .finally(() => {
          this.instanceLoginInFlight.delete(instanceId);
        });
      this.instanceLoginInFlight.set(instanceId, p);
      return p;
    }
  }

  private async _doLogin(instanceId?: string): Promise<void> {
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

      const response: any = await this.sendPostRequest(endpoint, json);

      if (response.success) {
        logger.amp(`AMP logged in successfully.`);

        if (instanceId) {
          this.instanceSessionIds.set(instanceId, response.sessionID); /** Cache instance session ID */
        } else {
          this.baseSessionId = response.sessionID; /** Cache base session ID */
        }

        // Note: response.rememberMeToken and response.userInfo.ID are not used currently
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
