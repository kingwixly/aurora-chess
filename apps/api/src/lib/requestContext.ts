import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a callback within a request context that carries the request ID.
 * Any code called within the callback (sync or async) can retrieve the ID
 * via `getRequestId()`.
 *
 * @param requestId - The Fastify request ID.
 * @param fn - The callback to run within the context.
 * @returns The return value of the callback.
 */
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return storage.run({ requestId }, fn);
}

/**
 * Get the current request ID from the async context.
 * Returns undefined if called outside a request context.
 *
 * @returns The request ID or undefined.
 */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Enter a request context. Returns a function to exit the context.
 * Used by Fastify hooks to wrap the entire request lifecycle.
 *
 * @param requestId - The Fastify request ID.
 */
export function enterRequestContext(requestId: string): void {
  storage.enterWith({ requestId });
}
