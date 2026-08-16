import {
  createLogger,
  format,
  transports,
  Logger as WinstonLogger,
  addColors,
} from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    debug: 2,
    commands: 3, /** Adding a custom 'success' level */
    updates: 4,
    amp: 5,
    info: 6,

  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    commands: 'blue', /** Adding a color for the 'success' level */
    updates: 'cyan',
    amp: 'magenta',
  },
};

addColors(customLevels.colors); /** Register custom colors for levels */

class Logger {
  private logger: WinstonLogger;

  constructor() {
    const mode = (process.env.LOG_LEVEL || 'log').toLowerCase();

    // Per-mode allowed levels: 'log' = success/failure only; 'debug' = typical detail; 'deep' = all
    const allowedSets: Record<string, Set<string> | null> = {
      log: new Set(['info', 'error']),
      debug: new Set(['error', 'warn', 'info', 'debug', 'commands', 'updates', 'amp']),
      deep: null, // allow all
    };
    const allowed = allowedSets[mode] ?? allowedSets.log;

    const filterByMode = format((info) => {
      if (!allowed) return info; // deep
      return allowed.has(String(info.level)) ? info : false;
    });

    const consoleFormat = format.combine(
      filterByMode(),
      format.colorize({ all: true }),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level}] ${message}`),
    );

    const fileFormat = format.combine(
      filterByMode(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}] ${message}`),
    );

    this.logger = createLogger({
      levels: customLevels.levels, /** Use custom levels */
      level: 'info', /** Keep highest to allow filter to decide */
      transports: [
        new transports.Console({ format: consoleFormat }),
        new DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
          format: fileFormat,
        }),
      ],
    });
  }

  /** Log an informational message */
  public info(message: string): void {
    this.logger.info(message);
  }

  /** Log a warning message */
  public warn(message: string): void {
    this.logger.warn(message);
  }

  /** Log an error message */
  public error(message: string, e?: any): void {
    const extra = e ? (e?.message ?? String(e)) : '';
    this.logger.error(extra ? `${message} | ${extra}` : message);
  }

  /** Log a debug message */
  public debug(message: string): void {
    this.logger.debug(message);
  }

  /** Log a very verbose message (deep debug) */
  public deepDebug(message: string): void {
    // Use existing 'debug' channel; filtered in 'log' mode and shown in 'debug/deep'
    this.logger.debug(message);
  }

  /** Log a success message (our custom level) */
  public commands(message: string): void {
    this.logger.log('commands', message); /** Use the custom 'success' level */
  }

  /** Log a success message (our custom level) */
  public updates(message: string): void {
    this.logger.log('updates', message); /** Use the custom 'success' level */
  }

  /** Log a success message (our custom level) */
  public amp(message: string): void {
    this.logger.log('amp', message); /** Use the custom 'success' level */
  }
}

/** Export an instance of the Logger */
const logger = new Logger();
export default logger;
