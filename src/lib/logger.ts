import { SDK_NAME } from './constant';

const enum LogLevel {
  DEBUG = 4,
  INFO = 3,
  WARN = 2,
  ERROR = 1,
  NONE = 0
}

class ConsoleLogger implements Logger {
  private readonly logLevel: LogLevel;

  constructor(logLevel: LogLevel) {
    this.logLevel = logLevel;
  }

  public debug(...args: any) {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(`${SDK_NAME} DEBUG:`, ...args);
    }
  }

  public info(...args: any) {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(`${SDK_NAME} INFO:`, ...args);
    }
  }

  public warn(...args: any) {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(`${SDK_NAME} WARN:`, ...args);
    }
  }

  public error(...args: any) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(`${SDK_NAME} ERROR:`, ...args);
    }
  }
}

interface Logger {
  debug(...args: any): void;
  info(...args: any): void;
  warn(...args: any): void;
  error(...args: any): void;
}

export {ConsoleLogger, LogLevel, Logger};
