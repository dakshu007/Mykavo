/**
 * Structured JSON logger (spec §45). One line per event; context fields
 * (requestId, jobId, scanId, websiteId, workspaceId, ...) travel as
 * structured data, never interpolated into the message.
 *
 * Secrets, tokens, cookies, and sensitive headers must never be passed in.
 */

type Level = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, string | number | boolean | null | undefined>;

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minLevel: Level = process.env.NODE_ENV === "production" ? "info" : "debug";

function emit(level: Level, message: string, context?: LogContext, error?: unknown) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    msg: message,
    ...context,
  };

  if (error instanceof Error) {
    entry.error = { name: error.name, message: error.message, stack: error.stack };
  } else if (error !== undefined) {
    entry.error = String(error);
  }

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext, error?: unknown) =>
    emit("error", message, context, error),
  /** Returns a logger with context fields bound to every call. */
  child(bound: LogContext) {
    return {
      debug: (m: string, c?: LogContext) => emit("debug", m, { ...bound, ...c }),
      info: (m: string, c?: LogContext) => emit("info", m, { ...bound, ...c }),
      warn: (m: string, c?: LogContext) => emit("warn", m, { ...bound, ...c }),
      error: (m: string, c?: LogContext, e?: unknown) =>
        emit("error", m, { ...bound, ...c }, e),
    };
  },
};
