import pino from "pino";
import type { LoggerOptions } from "pino";
import { getRequestId } from "./requestContext.js";

const isProduction = process.env.NODE_ENV === "production";

// Pino options shared between Fastify and standalone loggers
export const loggerOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
};

// Standalone logger for non-Fastify code (worker, etc.)
export const logger = pino(loggerOptions);

/**
 * Create a child logger that includes the module name and auto-attaches
 * the current request ID from AsyncLocalStorage when available.
 */
export function createChildLogger(name: string) {
  const child = logger.child({ module: name });
  return new Proxy(child, {
    get(target, prop) {
      const val = target[prop as keyof typeof target];
      if (
        typeof val === "function" &&
        ["info", "error", "warn", "debug", "trace", "fatal"].includes(String(prop))
      ) {
        return (...args: unknown[]) => {
          const reqId = getRequestId();
          if (reqId && typeof args[0] === "object" && args[0] !== null) {
            (args[0] as Record<string, unknown>).reqId = reqId;
          } else if (reqId && typeof args[0] === "string") {
            args.unshift({ reqId });
          }
          return (val as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return val;
    },
  });
}
