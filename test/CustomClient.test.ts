import CustomClient from '../src/CustomClient';

jest.mock('../src/Config', () => ({ config: { AMP_USERNAME: 'u', AMP_PASS: 'p' } }));

describe('CustomClient', () => {
  it('instantiates CustomClient with initial empty state', () => {
    const client = new CustomClient();
    expect(client.getGuildState('123')).toBeUndefined();
    expect(client.commands).toBeDefined();
    expect(client.disboardTimer).toBeNull();
  });

  it('cleanupGuildState clears interval and resets state', () => {
    const client = new CustomClient();

    const mockState: any = {
      amp: {} as any,
      servers: {} as any,
      roleMapper: {} as any,
      messageCache: new Map([['key', 'val']]),
      updateInterval: setInterval(() => {}, 1000),
    };

    // @ts-ignore
    client.singleState = mockState;
    expect(client.getGuildState('123')).toBe(mockState);

    client.cleanupGuildState('123');
    expect(client.getGuildState('123')).toBeUndefined();
    expect(mockState.messageCache.size).toBe(0);
  });
});
