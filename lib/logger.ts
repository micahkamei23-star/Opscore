// Centralized logging system
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

type LogTransport = (entry: LogEntry) => void;

class Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = "info";

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  addTransport(transport: LogTransport): this {
    this.transports.push(transport);
    return this;
  }

  setMinLevel(level: LogLevel): this {
    this.minLevel = level;
    return this;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (this.levels[level] < this.levels[this.minLevel]) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now(),
    };

    for (const transport of this.transports) {
      try {
        transport(entry);
      } catch {
        // silently ignore transport errors
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }
}

// Console transport
const consoleTransport: LogTransport = (entry) => {
  const ts = new Date(entry.timestamp).toISOString();
  const prefix = `[${ts}] [${entry.level.toUpperCase()}]`;
  const ctx = entry.context ? JSON.stringify(entry.context) : "";

  switch (entry.level) {
    case "debug":
      console.debug(prefix, entry.message, ctx);
      break;
    case "info":
      console.info(prefix, entry.message, ctx);
      break;
    case "warn":
      console.warn(prefix, entry.message, ctx);
      break;
    case "error":
      console.error(prefix, entry.message, ctx);
      break;
  }
};

export const logger = new Logger()
  .addTransport(consoleTransport)
  .setMinLevel(process.env.NODE_ENV === "development" ? "debug" : "info");
