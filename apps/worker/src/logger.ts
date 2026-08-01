/** Structured JSON logger for the worker (spec §45). */

type LogContext = Record<string, string | number | boolean | null | undefined>;

/** Errors from libraries (pg-boss, pg) are not always Error instances; a bare
 *  String() on those prints "[object Object]", which once hid 19 hours of
 *  identical pool failures. Preserve whatever detail the value carries. */
function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "object" && error !== null) {
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return JSON.parse(json);
    } catch {
      // circular - fall through to the property probe
    }
    const maybe = error as { name?: unknown; message?: unknown };
    return {
      name: maybe.name !== undefined ? String(maybe.name) : "Object",
      message: maybe.message !== undefined ? String(maybe.message) : String(error),
    };
  }
  return String(error);
}

function emit(level: "info" | "warn" | "error", message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    app: "worker",
    msg: message,
    ...context,
  };
  if (error !== undefined) entry.error = serializeError(error);
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
