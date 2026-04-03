/**
 * AppCat Server SDK (Node.js).
 *
 * Use this for server-side event tracking — webhook handlers,
 * payment callbacks, background jobs, etc.
 *
 * Usage:
 * ```ts
 * import { AppCatServer } from '@appcat/web-sdk/server';
 *
 * const appcat = new AppCatServer({
 *   appId: 'your-app-id',
 *   apiKey: 'your-api-key',
 * });
 *
 * await appcat.trackEvent({
 *   name: 'Purchase',
 *   value: 29.99,
 *   currency: 'USD',
 *   deviceId: 'user-device-id',
 * });
 *
 * await appcat.identify({
 *   deviceId: 'user-device-id',
 *   userId: 'user_123',
 *   email: 'user@example.com',
 * });
 * ```
 */

import { ApiClient } from './api-client';
import type {
  AppCatConfig,
  TrackEventParams,
  IdentifyParams,
} from './types';

/** Server-side event params require a deviceId to identify the user. */
export interface ServerTrackEventParams extends TrackEventParams {
  /** Device ID of the user (from the client SDK). */
  deviceId: string;
  /** User email for server-side hashing (advanced matching). */
  userEmail?: string;
  /** User phone for server-side hashing (advanced matching). */
  userPhone?: string;
  /** Client IP address (for attribution resolution). */
  clientIp?: string;
}

/** Server-side identify params require a deviceId. */
export interface ServerIdentifyParams extends IdentifyParams {
  /** Device ID of the user (from the client SDK). */
  deviceId: string;
  /** Client IP address. */
  clientIp?: string;
  /** Geo data if available. */
  geo?: Record<string, unknown>;
}

export class AppCatServer {
  private client: ApiClient;
  private appId: string;

  constructor(config: AppCatConfig) {
    if (!config.appId || !config.apiKey) {
      throw new Error('[AppCat] appId and apiKey are required');
    }
    this.client = new ApiClient(config);
    this.appId = config.appId;
  }

  /**
   * Track a CAPI event server-side.
   * Use for webhook-triggered events (purchases, trial conversions, etc.).
   */
  async trackEvent(params: ServerTrackEventParams): Promise<boolean> {
    const eventId = params.eventId || `${params.name}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timeUnix = Math.floor(Date.now() / 1000);

    const result = await this.client.post('/attribution/device/send-attribute', {
      deviceId: params.deviceId,
      appId: this.appId,
      providers: 'meta,tiktok',
      name: params.name,
      time_unix: timeUnix,
      id: eventId,
      ...(params.value !== undefined ? { value: params.value } : {}),
      ...(params.currency ? { currency: params.currency } : {}),
      ...(params.userEmail ? { user_email: params.userEmail } : {}),
      ...(params.userPhone ? { user_phone: params.userPhone } : {}),
      custom_data: {
        ...params.data,
        platform: 'web',
        event_id: eventId,
      },
    });

    return result !== null;
  }

  /**
   * Link user identity to an attribution profile server-side.
   * Call after login/signup from your backend.
   */
  async identify(params: ServerIdentifyParams): Promise<boolean> {
    const result = await this.client.post('/attribution/device/identify', {
      deviceId: params.deviceId,
      appId: this.appId,
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.email ? { email: params.email } : {}),
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.name ? { name: params.name } : {}),
      ...(params.geo ? { geo: params.geo } : {}),
    });

    return result !== null;
  }
}

export type { AppCatConfig, TrackEventParams, IdentifyParams } from './types';
