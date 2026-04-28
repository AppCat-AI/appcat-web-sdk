/**
 * @appcat/web-sdk
 *
 * Browser entry point. For Node.js server-side usage, import from '@appcat/web-sdk/server'.
 *
 * Browser usage:
 * ```ts
 * import { AppCat } from '@appcat/web-sdk';
 *
 * const { deepLinkParams } = await AppCat.init({
 *   appId: 'your-app-id',
 *   apiKey: 'your-api-key',
 * });
 * if (deepLinkParams) router.navigate(deepLinkParams);
 *
 * AppCat.trackEvent({ name: 'ViewContent', data: { page: '/pricing' } });
 * AppCat.identify({ userId: 'user_123', email: 'user@example.com' });
 * ```
 *
 * Server usage:
 * ```ts
 * import { AppCatServer } from '@appcat/web-sdk/server';
 *
 * const appcat = new AppCatServer({ appId: 'your-app-id', apiKey: 'your-api-key' });
 * await appcat.trackEvent({ name: 'Purchase', deviceId: 'device_abc', value: 9.99 });
 * ```
 */
export { AppCat } from './browser';
export type {
  AppCatConfig,
  InitResponse,
  EventName,
  TrackEventParams,
  IdentifyParams,
  DeepLinkParams,
  Attribution,
} from './browser';
