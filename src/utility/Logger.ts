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
    commands: 3, // Adding a custom 'success' level
    updates: 4,
    amp: 5,
    info: 6,

  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    commands: 'blue', // Adding a color for the 'success' level
    updates: 'cyan',
    amp: 'magenta',
  },
};

addColors(customLevels.colors); // Register custom colors for levels

class Logger {
  private logger: WinstonLogger;

  constructor() {
    this.logger = createLogger({
      levels: customLevels.levels, // Use custom levels
      level: 'info', // Default logging level
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamp to logs
        format.printf(
          ({ timestamp, level, message }) =>
            `[${timestamp}] [${level.toUpperCase()}] ${message}`,
        ),
      ),
      transports: [
        // Log messages to the console with colorization
        new transports.Console({
          format: format.combine(
            format.colorize({
              all: true, // Enable colorization for all levels
            }),
            format.timestamp({
              format: 'YYYY-MM-DD HH:mm:ss',
            }),
            format.printf(
              ({ timestamp, level, message }) =>
                `[${timestamp}] [${level}] ${message}`,
            ),
          ),
        }),
        // Log messages to a daily rotating file
        new DailyRotateFile({
          filename: 'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
      ],
    });
  }

  // Log an informational message
  public info(message: string): void {
    this.logger.info(message);
  }

  // Log a warning message
  public warn(message: string): void {
    this.logger.warn(message);
  }

  // Log an error message
  public error(message: string, e?: any): void {
    this.logger.error(message);
  }

  // Log a debug message
  public debug(message: string): void {
    this.logger.debug(message);
  }

  // Log a success message (our custom level)
  public commands(message: string): void {
    this.logger.log('commands', message); // Use the custom 'success' level
  }

  // Log a success message (our custom level)
  public updates(message: string): void {
    this.logger.log('updates', message); // Use the custom 'success' level
  }

  // Log a success message (our custom level)
  public amp(message: string): void {
    this.logger.log('amp', message); // Use the custom 'success' level
  }
}

// Export an instance of the Logger
const logger = new Logger();
export default logger;
