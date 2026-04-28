/**
 * Internal defensive-call helpers for the open-source web SDK wrapper.
 *
 * Rationale: the vendored `core/` bundle is already hardened, but this
 * wrapper is the SDK's public boundary. A single unexpected throw inside
 * the core — or in a host environment quirk we did not anticipate
 * (locked-down storage, strict CSP, Node 18 without `AbortController`,
 * SSR contexts, etc.) — must never propagate to consumer code or turn
 * into an unhandled rejection that crashes the host.
 *
 * Every public export routes through one of these helpers.
 *
 * Design constraints:
 *  - Zero runtime dependencies.
 *  - Works in browser and Node.js (no `window` / `process` access here).
 *  - Never throws. Ever.
 */

const TAG = '[AppCat]';

/**
 * Log safely. `console` can be missing (some sandboxes) or throw when
 * stubbed; we must never let logging take the host down.
 */
function logError(scope: string, err: unknown): void {
  try {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error(`${TAG} ${scope} failed`, err);
    }
  } catch {
    // Ignore: logging is best-effort.
  }
}

/** Run a synchronous function, return fallback on any throw. */
export function safeSync<T>(fn: () => T, fallback: T, scope: string): T {
  try {
    return fn();
  } catch (err) {
    logError(scope, err);
    return fallback;
  }
}

/** Run a synchronous void function, swallow any throw. */
export function safeVoid(fn: () => void, scope: string): void {
  try {
    fn();
  } catch (err) {
    logError(scope, err);
  }
}

/**
 * Run an async function, return fallback on any throw or rejection.
 * Catches both synchronous throws (before the first await) and rejections.
 */
export async function safeAsync<T>(
  fn: () => Promise<T> | T,
  fallback: T,
  scope: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logError(scope, err);
    return fallback;
  }
}

/**
 * Run an async function for its side effects only; swallow any throw
 * or rejection and resolve to `void`.
 */
export async function safeAsyncVoid(
  fn: () => Promise<unknown> | unknown,
  scope: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logError(scope, err);
  }
}

/**
 * Defensively attach a no-op `.catch()` to every Promise-valued field on
 * the given object.
 *
 * The vendored core stores in-flight async init (e.g. auto-resolving
 * `appId` from the server) as a Promise field on its singleton / instance.
 * If that Promise rejects and the consumer never calls a method that
 * awaits it, Node will surface it as an unhandledRejection. This sweeper
 * runs right after construction / init to neutralise that class of crash.
 */
export function swallowPromiseFields(target: unknown): void {
  try {
    if (target === null || typeof target !== 'object') return;
    const record = target as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const value = record[key];
      if (isThenable(value)) {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        (value as Promise<unknown>).catch(() => {});
      }
    }
  } catch {
    // Ignore: object is exotic (Proxy, frozen with hostile get trap, etc.).
  }
}

function isThenable(value: unknown): value is Promise<unknown> {
  if (value === null || typeof value !== 'object') return false;
  try {
    const then = (value as { then?: unknown }).then;
    const catcher = (value as { catch?: unknown }).catch;
    return typeof then === 'function' && typeof catcher === 'function';
  } catch {
    return false;
  }
}
