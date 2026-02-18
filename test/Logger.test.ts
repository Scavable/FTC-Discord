import * as winston from 'winston';
import logger from '../src/utility/Logger';

jest.mock('winston', () => {
  const actual = jest.requireActual('winston');
  const fakeLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };
  return {
    ...actual,
    createLogger: jest.fn(() => fakeLogger),
    transports: {
      Console: function Console() {},
      File: function File() {},
    },
    format: {
      combine: jest.fn((...args) => args),
      colorize: jest.fn(() => (x: any) => x),
      timestamp: jest.fn(() => (x: any) => x),
      printf: jest.fn((fn: any) => fn),
    },
  } as any;
});

describe('Logger wrapper', () => {
  it('forwards calls to underlying winston logger', () => {
    const mocked = (winston.createLogger as unknown as jest.Mock)();

    logger.info('hello');
    logger.warn('w');
    logger.error('e', e);
    logger.debug('d');
    logger.commands('c');

    expect(mocked.info).toHaveBeenCalledWith('hello');
    expect(mocked.warn).toHaveBeenCalledWith('w');
    expect(mocked.error).toHaveBeenCalledWith('e');
    expect(mocked.debug).toHaveBeenCalledWith('d');
    expect(mocked.log).toHaveBeenCalledWith('commands', 'c');
  });
});
