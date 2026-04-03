/** Configuration for AppCat SDK initialization. */
export interface AppCatConfig {
  /** Your app ID from the AppCat dashboard. */
  appId: string;
  /** Your API key from the AppCat dashboard. */
  apiKey: string;
  /** API base URL. Defaults to https://appcat.ai/api */
  apiBaseUrl?: string;
  /** Enable debug logging. */
  debug?: boolean;
}

/** Event names supported by CAPI providers. */
export type EventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'StartTrial'
  | 'Subscribe'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'Search'
  | (string & {});

/** Parameters for tracking an event. */
export interface TrackEventParams {
  /** Event name. */
  name: EventName;
  /** Custom data to attach to the event. */
  data?: Record<string, unknown>;
  /** Monetary value of the event. */
  value?: number;
  /** Currency code (e.g. "USD"). */
  currency?: string;
  /** Deduplicate event across client/server using this ID. */
  eventId?: string;
}

/** User identity for the identify call. */
export interface IdentifyParams {
  /** Your internal user ID. */
  userId?: string;
  /** User email (hashed server-side for privacy). */
  email?: string;
  /** User phone number (hashed server-side for privacy). */
  phone?: string;
  /** User display name. */
  name?: string;
}

/** Deep link parameters returned from resolve. */
export type DeepLinkParams = Record<string, string | undefined>;

/** Opaque attribution data returned from resolve. */
export type Attribution = Record<string, unknown>;

/** Result from a resolve call. */
export interface ResolveResult {
  matched: boolean;
  matchMethod?: string;
  deepLinkParams?: DeepLinkParams;
  attribution?: Attribution;
}
