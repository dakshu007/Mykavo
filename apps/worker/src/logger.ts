/** Structured JSON logger for the worker (spec §45). */

type LogContext = Record<string, string | number | boolean | null | undefined>;

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    app: "worker",
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
  info: (m: string, c?: LogContext) => emit("info", m, c),
  warn: (m: string, c?: LogContext) => emit("warn", m, c),
  error: (m: string, c?: LogContext, e?: unknown) => emit("error", m, c, e),
};
