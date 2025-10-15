import fs from 'node:fs';
import ServersFile from '../src/utility/ServersFile';
import type Instance from '../src/types/Instance';

jest.mock('node:fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ServersFile', () => {
  beforeEach(() => {
    // @ts-ignore private access not enforced at runtime; reset by reading empty
    // Reset mock state
    jest.resetAllMocks();
  });

  it('readFile parses JSON array and populates map', () => {
    const instances: Instance[] = [
      { FriendlyName: 'A', InstanceID: '1', Suspended: false } as any,
      { FriendlyName: 'B', InstanceID: '2', Suspended: false } as any,
    ];
    mockedFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(instances)));

    const map = ServersFile.readFile('servers.json');
    expect(mockedFs.readFileSync).toHaveBeenCalledWith('servers.json');
    expect(map.get('A')?.InstanceID).toBe('1');
    expect(map.get('B')?.InstanceID).toBe('2');

    // getInstances returns same map reference
    expect(ServersFile.getInstances()).toBe(map);
  });

  it('writeFile delegates to fs.writeFileSync', () => {
    ServersFile.writeFile('out.json', '[1]');
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith('out.json', '[1]');
  });
});
