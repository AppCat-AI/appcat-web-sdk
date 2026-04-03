import { ApiClient } from './api-client';
import type {
  AppCatConfig,
  TrackEventParams,
  IdentifyParams,
  ResolveResult,
} from './types';

/** Generate a random event ID for pixel ↔ CAPI deduplication. */
function generateEventId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Read a cookie by name. */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Set a cookie. */
function setCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined') return;
  const maxAge = maxAgeDays * 86400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Get or generate a stable device ID stored in localStorage. */
function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return generateEventId();
  const key = '__appcat_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `web_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/** Collect browser signals for attribution matching. */
function collectBrowserContext(): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  try {
    ctx.screen_width = window.screen.width * (window.devicePixelRatio || 1);
    ctx.screen_height = window.screen.height * (window.devicePixelRatio || 1);
    ctx.screen_density = window.devicePixelRatio || 1;
    ctx.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    ctx.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    ctx.user_agent = navigator.userAgent;
    ctx.platform = 'web';
  } catch { /* best effort */ }
  return ctx;
}

/**
 * AppCat Browser SDK.
 *
 * Usage:
 * ```ts
 * import { AppCat } from '@appcat/web-sdk';
 *
 * AppCat.init({ appId: 'your-app-id', apiKey: 'your-api-key' });
 * AppCat.trackEvent({ name: 'Purchase', value: 9.99, currency: 'USD' });
 * AppCat.identify({ userId: 'user_123', email: 'user@example.com' });
 * ```
 */
export const AppCat = {
  _client: null as ApiClient | null,
  _config: null as AppCatConfig | null,
  _deviceId: '',

  /** Initialize the SDK. Must be called before any other method. */
  init(config: AppCatConfig): void {
    if (!config.appId || !config.apiKey) {
      console.error('[AppCat] appId and apiKey are required');
      return;
    }
    this._config = config;
    this._client = new ApiClient(config);
    this._deviceId = getDeviceId();
  },

  /**
   * Track a CAPI event.
   * Sends to Meta CAPI, TikTok Events API, etc. via your backend.
   */
  async trackEvent(params: TrackEventParams): Promise<void> {
    if (!this._client) {
      console.error('[AppCat] SDK not initialized. Call AppCat.init() first.');
      return;
    }

    const eventId = params.eventId || generateEventId();
    const timeUnix = Math.floor(Date.now() / 1000);

    await this._client.post('/attribution/device/send-attribute', {
      deviceId: this._deviceId,
      appId: this._config!.appId,
      providers: 'meta,tiktok',
      name: params.name,
      time_unix: timeUnix,
      id: eventId,
      ...(params.value !== undefined ? { value: params.value } : {}),
      ...(params.currency ? { currency: params.currency } : {}),
      custom_data: {
        ...params.data,
        platform: 'web',
        event_id: eventId,
      },
    });
  },

  /**
   * Link user identity to the attribution profile.
   * Call after login/signup so backend can resolve by userId/email/phone.
   */
  async identify(params: IdentifyParams): Promise<void> {
    if (!this._client) {
      console.error('[AppCat] SDK not initialized. Call AppCat.init() first.');
      return;
    }

    await this._client.post('/attribution/device/identify', {
      deviceId: this._deviceId,
      appId: this._config!.appId,
      ...params,
    });
  },

  /**
   * Store a landing page click for deferred deep link resolution.
   * Call on your landing page to capture ad click parameters.
   */
  async storeClick(queryParams?: Record<string, string>): Promise<void> {
    if (!this._client) {
      console.error('[AppCat] SDK not initialized. Call AppCat.init() first.');
      return;
    }

    const params = queryParams || Object.fromEntries(new URLSearchParams(window.location.search));
    if (Object.keys(params).length === 0) return;

    const context = collectBrowserContext();

    await this._client.post('/deferred-deep-link/store', {
      ...params,
      ...context,
      deviceId: this._deviceId,
    });
  },

  /**
   * Resolve a deferred deep link.
   * Call on app open to check if the user came from an ad click.
   */
  async resolve(): Promise<ResolveResult | null> {
    if (!this._client) {
      console.error('[AppCat] SDK not initialized. Call AppCat.init() first.');
      return null;
    }

    const context = collectBrowserContext();

    return this._client.post<ResolveResult>('/deferred-deep-link/resolve', {
      ...context,
      deviceId: this._deviceId,
    });
  },

  /** Get the current device ID. */
  getDeviceId(): string {
    return this._deviceId;
  },

  /** Read the _fbc cookie (Meta Click ID). */
  getFbc(): string | undefined {
    return getCookie('_fbc');
  },

  /** Read the _fbp cookie (Meta Browser ID). */
  getFbp(): string | undefined {
    return getCookie('_fbp');
  },

  /** Read the _ttp cookie (TikTok ID). */
  getTtp(): string | undefined {
    return getCookie('_ttp');
  },
};
