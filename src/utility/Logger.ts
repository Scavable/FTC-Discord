// <llm-snippet-file>src/utility/Logger.ts</llm-snippet-file>
import { createLogger, format, transports, Logger as WinstonLogger } from "winston";

class Logger {
    private logger: WinstonLogger;

    constructor() {
        this.logger = createLogger({
            level: "info", // Default logging level
            format: format.combine(
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Add timestamp to logs
                format.printf(({ timestamp, level, message }) =>
                    `[${timestamp}] [${level.toUpperCase()}] ${message}`
                )
            ),
            transports: [
                // Log messages to the console with better formatting
                new transports.Console({
                    format: format.combine(
                        format.colorize({
                            all: true, // Colors the entire log line
                        }),
                        format.timestamp({
                            format: "YYYY-MM-DD HH:mm:ss",
                        }),
                        format.printf(({ timestamp, level, message }) =>
                            `[${timestamp}] [${level}] ${message}`
                        )
                    ),
                }),
                // Log messages to a file
                new transports.File({ filename: "logs/app.log", level: "info" }),
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
    public error(message: string): void {
        this.logger.error(message);
    }

    // Log a debug message
    public debug(message: string): void {
        this.logger.debug(message);
    }
}

// Export an instance of the Logger
const logger = new Logger();
export default logger;