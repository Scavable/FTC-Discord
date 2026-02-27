import Instance from '../types/Instance';
import logger from '../utility/Logger';

/**
 * Interface for the API Client that modules will use.
 * This decouples the modules from the main Amp class.
 */
export interface IAmpClient {
  readonly API_BASE_URL: string;
  sendPostRequest(url: string, data?: any, SessionID?: string): Promise<any>;
  ensureAuthenticated(instanceId?: string): Promise<void>;
  getSessionId(instanceId?: string): string;
}

/**
 * Base class for all AMP modules (Core, FileManager, etc.)
 */
export abstract class AmpModule {
  protected constructor(protected readonly client: IAmpClient) {}
}
