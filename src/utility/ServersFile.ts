import fs from 'node:fs';
import Instance from '../types/Instance';

class ServersFile {
  private static instances: Map<string, Instance> = new Map<string, Instance>();

  public static getInstances(){
    return this.instances;
  }

  public static readFile(file: string): Map<string, Instance> {

    const fileOutput: string = fs.readFileSync(file).toString();
    const json = JSON.parse(fileOutput);
    json.forEach((instance: Instance) => {
      this.instances.set(instance.FriendlyName, instance);
    });

    return this.instances;
  }

  public static writeFile(file: string, json: string) {
    fs.writeFileSync(file, json);
  }
}

export default ServersFile;
