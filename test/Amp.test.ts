import Amp from '../src/amp/Amp';
import logger from '../src/utility/Logger';
import type Instance from '../src/types/Instance';

jest.mock('../src/utility/Logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  commands: jest.fn(),
  amp: jest.fn(),
}));


declare const global: any;

describe('Amp', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
    // atob polyfill for Node
    // @ts-ignore
    global.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  });

  function makeAmp() {
    return new Amp('user', 'pass');
  }

  it('login sets base session when instanceId not provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, sessionID: 'BASE', rememberMeToken: 'T', userInfo: { ID: 'UID' } }),
    });

    const amp = makeAmp();
    await amp.login();

    // next call requiring auth should succeed without throwing from ensureAuthenticated
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ([{ AvailableInstances: [] }]),
    });
    const list = await amp.getInstances();
    expect(Array.isArray(list)).toBe(true);
  });

  it('login caches instance session when instanceId provided', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, sessionID: 'INST-123', rememberMeToken: 'T', userInfo: { ID: 'UID' } }),
    });

    const amp = makeAmp();
    await amp.login('inst');

    // Now getUpdates should call ensureAuthenticated which will find the instance session after login()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true, val: 1 }),
    });
    const res = await amp.getUpdates('inst');
    expect(typeof res).toBe('string');
  });

  it('getInstances returns [] on error and logs', async () => {
    // First authenticate
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, sessionID: 'BASE', rememberMeToken: 'T', userInfo: { ID: 'UID' } }),
    });
    const amp = makeAmp();
    await amp.login();

    // Then make GetInstances return bad format
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ not: 'expected' }),
    });

    const list = await amp.getInstances();
    expect(list).toEqual([]);
  });

  it('readFile filters servers and annotates values, updates cache (no file I/O)', async () => {
    // Authenticate base
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, sessionID: 'BASE', rememberMeToken: 'T', userInfo: { ID: 'UID' } }),
    });
    const amp = makeAmp();
    await amp.login();

    // For each server: login(instance), ReadFileChunk, then GetConfig
    // login(instance)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, sessionID: 'S1', userInfo: { ID: 'U1' } }),
    });
    // ReadFileChunk returns base64 of {IP, Version, Hidden}
    const packInfo = { IP: '127.0.0.1', Version: '1.0', Hidden: true };
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ Result: Buffer.from(JSON.stringify(packInfo), 'utf8').toString('base64') }),
    });
    // GetConfig
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ CurrentValue: true }),
    });

    const servers: Partial<Instance>[] = [
      { FriendlyName: 'MyServer', InstanceID: 'id1', Suspended: false },
      { FriendlyName: 'BotHelper', InstanceID: 'id2', Suspended: false }, // will be skipped
    ];

    const out = await amp.readFile(servers as Instance[]);
    expect(out[0].FTCIP).toBe('127.0.0.1');
    expect(out[0].FTCVersion).toBe('1.0');
    expect(out[0].Hidden).toBe(true);
    expect(out[0].Whitelisted).toBe(true);
  });
});
