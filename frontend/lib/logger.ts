export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerOptions {
  minLevel?: LogLevel;
  includeTimestamp?: boolean;
  timestampFormat?: 'iso' | 'locale';
  includeContext?: boolean;
  contextSeparator?: string;
  colorizeOutput?: boolean;
}

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel;
  private includeTimestamp: boolean;
  private timestampFormat: 'iso' | 'locale';
  private includeContext: boolean;
  private contextSeparator: string;
  private colorizeOutput: boolean;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.INFO;
    this.includeTimestamp = options.includeTimestamp ?? true;
    this.timestampFormat = options.timestampFormat ?? 'iso';
    this.includeContext = options.includeContext ?? true;
    this.contextSeparator = options.contextSeparator ?? ' | ';
    this.colorizeOutput = options.colorizeOutput ?? (typeof window === 'undefined');
  }

  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  public static configure(options: LoggerOptions): void {
    const instance = Logger.getInstance();
    if (options.minLevel !== undefined) instance.minLevel = options.minLevel;
    if (options.includeTimestamp !== undefined) instance.includeTimestamp = options.includeTimestamp;
    if (options.timestampFormat !== undefined) instance.timestampFormat = options.timestampFormat;
    if (options.includeContext !== undefined) instance.includeContext = options.includeContext;
    if (options.contextSeparator !== undefined) instance.contextSeparator = options.contextSeparator;
    if (options.colorizeOutput !== undefined) instance.colorizeOutput = options.colorizeOutput;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return this.timestampFormat === 'iso'
      ? now.toISOString()
      : now.toLocaleString();
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const parts: string[] = [];

    if (this.includeTimestamp) {
      parts.push(`[${this.formatTimestamp()}]`);
    }

    parts.push(`[${level}]`);

    if (this.includeContext && context) {
      parts.push(`[${context}]`);
    }

    parts.push(message);

    return parts.join(this.contextSeparator);
  }

  public debug(message: string, context?: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formattedMessage = this.formatMessage('DEBUG', message, context);

    if (this.colorizeOutput && typeof process !== 'undefined') {
      console.debug('\x1b[36m%s\x1b[0m', formattedMessage, ...args);
    } else {
      console.debug(formattedMessage, ...args);
    }
  }

  public info(message: string, context?: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formattedMessage = this.formatMessage('INFO', message, context);

    if (this.colorizeOutput && typeof process !== 'undefined') {
      console.info('\x1b[32m%s\x1b[0m', formattedMessage, ...args);
    } else {
      console.info(formattedMessage, ...args);
    }
  }

  public warn(message: string, context?: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formattedMessage = this.formatMessage('WARN', message, context);

    if (this.colorizeOutput && typeof process !== 'undefined') {
      console.warn('\x1b[33m%s\x1b[0m', formattedMessage, ...args);
    } else {
      console.warn(formattedMessage, ...args);
    }
  }

  public error(message: string | Error, context?: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    let errorMessage: string;
    let errorObject: Error | undefined;

    if (message instanceof Error) {
      errorMessage = message.message;
      errorObject = message;
    } else {
      errorMessage = message;
    }

    const formattedMessage = this.formatMessage('ERROR', errorMessage, context);

    if (this.colorizeOutput && typeof process !== 'undefined') {
      console.error('\x1b[31m%s\x1b[0m', formattedMessage, ...(errorObject ? [errorObject.stack, ...args] : args));
    } else {
      console.error(formattedMessage, ...(errorObject ? [errorObject.stack, ...args] : args));
    }
  }
}

export const logger = Logger.getInstance();
