import { AmpModule } from '../AmpModule';

class Core extends AmpModule {
  /**
   * Gets changes to the server status, in addition to any notifications or
   * console output that have occurred since the last time GetUpdates() was
   * called by the current session.
   */
  async getUpdates(instanceId: string): Promise<string> {
    const json = {};
    const response = await this.client.sendPostRequest(
      `${this.client.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/GetUpdates`,
      json,
      this.client.getSessionId(instanceId),
    );
    return JSON.stringify(response);
  }

  /** Sends a string to a console */
  async sendConsoleMessage(instanceId: string, message: string): Promise<void> {
    const json = {
      message: message,
    };
    await this.client.sendPostRequest(
      `${this.client.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/SendConsoleMessage`,
      json,
      this.client.getSessionId(instanceId),
    );
  }

  /** Work in progress for better and more accurate player counts. */
  async getUserList(instanceId: string): Promise<string[]> {
    const json = {};
    const response = await this.client.sendPostRequest(
      `${this.client.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/GetUserList`,
      json,
      this.client.getSessionId(instanceId),
    );
    
    // Original logic: values of response
    const values: string[] = Object.values(response);
    // filter duplicates (though original code's deduplication was buggy)
    return Array.from(new Set(values));
  }
  
  /** Checks the instance module for the whitelist flag */
  async getConfig(instanceId: string): Promise<boolean> {
    const json = {
      SettingNode: 'Game',
      node: 'MinecraftModule.Game.Whitelist',
    };

    const response = await this.client.sendPostRequest(
      `${this.client.API_BASE_URL}API/ADSModule/Servers/${instanceId}/API/Core/GetConfig`,
      json,
      this.client.getSessionId(instanceId),
    );

    return response?.CurrentValue ?? false;
  }
}

export default Core;