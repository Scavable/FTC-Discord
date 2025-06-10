import fs from 'node:fs';

class ServersFile {
  public static readFile(file: string): string {
    return fs.readFileSync(file).toString();
  }

  public static writeFile(file: string, json: string) {
    fs.writeFileSync(file, json);
  }
}

export default ServersFile;
