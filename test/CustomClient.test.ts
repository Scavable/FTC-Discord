import CustomClient from '../src/CustomClient';

jest.mock('../src/Config', () => ({ config: { AMP_USERNAME: 'u', AMP_PASS: 'p' } }));

// Avoid creating real Discord client connection; tests just exercise class logic

describe('CustomClient', () => {
  it('initializeState creates Amp and resets state', () => {
    const client = new CustomClient();
    expect(client.amp).toBeNull();
    client.initializeState();
    expect(client.amp).not.toBeNull();
    expect(client.messageCache).toBeInstanceOf(Map);
    expect(client.updateInterval).toBeNull();
  });

  it('getAmpInstance lazy-initializes when missing', () => {
    const client = new CustomClient();
    // amp starts as null
    const amp = client.getAmpInstance();
    expect(amp).toBeDefined();
    expect(client.amp).toBe(amp);
  });

  it('cleanupState clears interval, cache, and amp', () => {
    const client = new CustomClient();
    client.initializeState();

    // simulate interval
    const handle = setInterval(() => {}, 1000);
    // @ts-ignore accessing private-like field
    client.updateInterval = handle as any;

    // populate cache
    client.messageCache.set('k', 'v');

    client.cleanupState();
    expect(client.updateInterval).toBeNull();
    expect(client.messageCache.size).toBe(0);
    expect(client.amp).toBeNull();
  });
});
