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
  const formatFn: any = jest.fn((transform: any) => {
    return jest.fn((info: any) => (transform && info ? transform(info) : info));
  });
  formatFn.combine = jest.fn((...args: any[]) => args);
  formatFn.colorize = jest.fn(() => (x: any) => x);
  formatFn.timestamp = jest.fn(() => (x: any) => x);
  formatFn.printf = jest.fn((fn: any) => fn);

  return {
    ...actual,
    createLogger: jest.fn(() => fakeLogger),
    transports: {
      Console: function Console() {},
      File: function File() {},
    },
    DailyRotateFile: function DailyRotateFile() {},
    format: formatFn,
  } as any;
});

describe('Logger wrapper', () => {
  it('forwards calls to underlying winston logger', () => {
    const mocked = (winston.createLogger as unknown as jest.Mock)();

    logger.info('hello');
    logger.warn('w');
    logger.error('e', new Error('e'));
    logger.debug('d');
    logger.commands('c');

    expect(mocked.info).toHaveBeenCalledWith('hello');
    expect(mocked.warn).toHaveBeenCalledWith('w');
    expect(mocked.error).toHaveBeenCalledWith('e | e');
    expect(mocked.debug).toHaveBeenCalledWith('d');
    expect(mocked.log).toHaveBeenCalledWith('commands', 'c');
  });
});
