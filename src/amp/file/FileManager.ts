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
}

export default FileManager;
