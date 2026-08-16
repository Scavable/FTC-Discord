import { Agent, setGlobalDispatcher } from 'undici';

// Keep-alive HTTP agent for Node fetch (undici)
const dispatcher = new Agent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  pipelining: 1,
  connections: 50,
});

setGlobalDispatcher(dispatcher);

// Export a used symbol so bundlers don't drop this module when sideEffects=false
export const KEEP_ALIVE_INITIALIZED = true;
