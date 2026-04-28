/**
 * Server SDK — public entry.
 *
 * Wraps the vendored `../core/appcat-core-server` class in a defensive
 * subclass-style facade. The core constructor may throw (missing
 * `apiKey`), and auto-init of `appId` runs as an internal promise that
 * can reject later; both are caught here so nothing propagates into
 * consumer code or becomes an unhandled rejection.
 *
 * Return types mirror the core: `boolean` for mutation calls (true on
 * success, false on any failure path).
 */

import { AppCatServer as CoreAppCatServer } from '../core/appcat-core-server';
import type {
  AppCatConfig as CoreAppCatConfig,
  ServerTrackEventParams,
  ServerIdentifyParams,
} from '../core/appcat-core-server';
import { safeAsync, swallowPromiseFields } from './_safe';

/** Public server SDK configuration. */
export interface AppCatConfig {
  /** Your API key from the AppCat dashboard. */
  apiKey: string;
  /** App ID, resolved automatically from API key if omitted. */
  appId?: string;
  /** Enable debug logging. */
  debug?: boolean;
}

export type {
  ServerTrackEventParams,
  ServerIdentifyParams,
} from '../core/appcat-core-server';
export type {
  TrackEventParams,
  IdentifyParams,
} from '../core/appcat-core-server';

type CoreInstance = InstanceType<typeof CoreAppCatServer>;

/**
 * Server-side SDK. Method signatures match the vendored core exactly;
 * only the call boundary is hardened.
 */
export class AppCatServer {
  private readonly _core: CoreInstance | null;

  constructor(config: AppCatConfig) {
    let core: CoreInstance | null = null;
    try {
      core = new CoreAppCatServer(toCoreConfig(config));
      // Core may have kicked off an `appId` auto-resolution promise.
      // Attach a no-op catch so a late rejection can't crash the process.
      swallowPromiseFields(core);
    } catch (err) {
      logConstructorError(err);
    }
    this._core = core;
  }

  async trackEvent(params: ServerTrackEventParams): Promise<boolean> {
    if (!this._core) return false;
    const core = this._core;
    return safeAsync(() => core.trackEvent(params), false, 'trackEvent');
  }

  async identify(params: ServerIdentifyParams): Promise<boolean> {
    if (!this._core) return false;
    const core = this._core;
    return safeAsync(() => core.identify(params), false, 'identify');
  }

  async setTrackingConsent(params: { deviceId: string; granted: boolean }): Promise<boolean> {
    if (!this._core) return false;
    const core = this._core;
    return safeAsync(() => core.setTrackingConsent(params), false, 'setTrackingConsent');
  }
}

/** Converts public config to the internal core config. */
function toCoreConfig(config: AppCatConfig): CoreAppCatConfig {
  const coreConfig: CoreAppCatConfig = { apiKey: config.apiKey };
  if (typeof config.appId === 'string') coreConfig.appId = config.appId;
  if (typeof config.debug === 'boolean') coreConfig.debug = config.debug;
  return coreConfig;
}

function logConstructorError(err: unknown): void {
  try {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error('[AppCat] AppCatServer constructor failed', err);
    }
  } catch {
    // Ignore: logging is best-effort.
  }
}
