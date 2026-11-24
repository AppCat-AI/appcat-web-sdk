/**
 * Browser SDK — public entry.
 *
 * Wraps the vendored `../core/appcat-core-browser` bundle in a defensive
 * facade. Every exported method has a top-level try/catch so that a throw
 * from the core — whether caused by a hostile host (private-mode storage,
 * sandboxed iframes, disabled cookies, strict CSP, missing
 * `AbortController`, etc.) — can never escape into consumer code.
 *
 * Public API mirrors the mobile SDKs (`@appcat/react-native-sdk`,
 * `appcat-ios-sdk`, `appcat-android-sdk`): a single `init()` call configures
 * the SDK and resolves any pending deferred deep link in one round-trip.
 * Callers no longer invoke `resolve()` separately.
 */

import { AppCat as CoreAppCat } from '../core/appcat-core-browser';
import type {
  AppCatConfig as CoreAppCatConfig,
  TrackEventParams,
  IdentifyParams,
  DeepLinkParams,
  ResolveResult,
} from '../core/appcat-core-browser';
import { safeSync, safeAsync, safeAsyncVoid, swallowPromiseFields } from './_safe';

/** Public browser SDK configuration. */
export interface AppCatConfig {
  /** Your API key from the AppCat dashboard. */
  apiKey: string;
  /** App ID, resolved automatically from API key if omitted. */
  appId?: string;
  /** Enable debug logging. */
  debug?: boolean;
}

/**
 * Response returned from `AppCat.init()`.
 *
 * Shape mirrors the mobile SDK responses: `deepLinkParams` are the query
 * params from the matched ad click URL (or `null` if no match), and
 * `matched`/`matchMethod` describe how the match was made.
 */
export interface InitResponse {
  /** Whether a click match was found for this device. */
  matched: boolean;
  /** How the match was made (e.g. `"ip_device"`, `"device_id"`). Optional. */
  matchMethod?: string;
  /** Query params from the matched ad click URL, or null if no match. */
  deepLinkParams: DeepLinkParams | null;
}

export type {
  EventName,
  TrackEventParams,
  IdentifyParams,
  DeepLinkParams,
  Attribution,
} from '../core/appcat-core-browser';

const EMPTY_INIT_RESPONSE: InitResponse = {
  matched: false,
  deepLinkParams: null,
};

/**
 * Browser singleton. Public surface mirrors the mobile SDKs: `init()` is
 * the single entry point that configures the SDK and resolves a deferred
 * deep link in one call.
 */
export const AppCat = {
  /**
   * Initialize the SDK and resolve any pending deferred deep link.
   *
   * Returns an `InitResponse` whose `deepLinkParams` carries the query
   * params from the matched ad click URL (or `null` on no match).
   */
  async init(config: AppCatConfig): Promise<InitResponse> {
    return safeAsync<InitResponse>(
      async () => {
        CoreAppCat.init(toCoreConfig(config));
        // Core kicks off async `appId` resolution as a Promise field when
        // `config.appId` is omitted. Defang any unhandled rejection, then
        // await it explicitly so `resolve()` runs against a ready client.
        swallowPromiseFields(CoreAppCat);
        if (CoreAppCat._initPromise) {
          try {
            await CoreAppCat._initPromise;
          } catch {
            // Init promise rejection is non-fatal — resolve will short-circuit.
          }
        }
        const result = await CoreAppCat.resolve();
        return toInitResponse(result);
      },
      EMPTY_INIT_RESPONSE,
      'init',
    );
  },

  trackEvent(params: TrackEventParams): Promise<void> {
    return safeAsyncVoid(() => CoreAppCat.trackEvent(params), 'trackEvent');
  },

  identify(params: IdentifyParams): Promise<void> {
    return safeAsyncVoid(() => CoreAppCat.identify(params), 'identify');
  },

  setTrackingConsent(granted: boolean): Promise<void> {
    return safeAsyncVoid(() => CoreAppCat.setTrackingConsent(granted), 'setTrackingConsent');
  },

  storeClick(queryParams?: Record<string, string>): Promise<void> {
    return safeAsyncVoid(() => CoreAppCat.storeClick(queryParams), 'storeClick');
  },

  getDeviceId(): string {
    return safeSync(() => CoreAppCat.getDeviceId(), '', 'getDeviceId');
  },

  getFbc(): string | undefined {
    return safeSync<string | undefined>(() => CoreAppCat.getFbc(), undefined, 'getFbc');
  },

  getFbp(): string | undefined {
    return safeSync<string | undefined>(() => CoreAppCat.getFbp(), undefined, 'getFbp');
  },

  getTtp(): string | undefined {
    return safeSync<string | undefined>(() => CoreAppCat.getTtp(), undefined, 'getTtp');
  },

  getGclid(): string | undefined {
    return safeSync<string | undefined>(() => CoreAppCat.getGclid(), undefined, 'getGclid');
  },
};

/** Converts public config to the internal core config. */
function toCoreConfig(config: AppCatConfig): CoreAppCatConfig {
  const coreConfig: CoreAppCatConfig = { apiKey: config.apiKey };
  if (typeof config.appId === 'string') coreConfig.appId = config.appId;
  if (typeof config.debug === 'boolean') coreConfig.debug = config.debug;
  return coreConfig;
}

/** Maps the internal `ResolveResult` to the public `InitResponse` shape. */
function toInitResponse(result: ResolveResult | null): InitResponse {
  if (!result) return EMPTY_INIT_RESPONSE;
  const response: InitResponse = {
    matched: result.matched === true,
    deepLinkParams: result.deepLinkParams ?? null,
  };
  if (typeof result.matchMethod === 'string') {
    response.matchMethod = result.matchMethod;
  }
  return response;
}
