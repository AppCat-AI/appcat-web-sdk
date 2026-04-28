/** Configuration for AppCat SDK initialization. */
interface AppCatConfig {
    /** Your API key from the AppCat dashboard. */
    apiKey: string;
    /** App ID, resolved automatically from API key if omitted. */
    appId?: string;
    /** Enable debug logging. */
    debug?: boolean;
}
/** Event names supported by CAPI providers. */
type EventName = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'StartTrial' | 'Subscribe' | 'Purchase' | 'CompleteRegistration' | 'Search' | (string & {});
/** Parameters for tracking an event. */
interface TrackEventParams {
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
interface IdentifyParams {
    /** Your internal user ID. */
    userId?: string;
    /** User email (hashed server-side for privacy). */
    email?: string;
    /** User phone number (hashed server-side for privacy). */
    phone?: string;
    /** User display name. */
    name?: string;
}

/** Server-side event params require a deviceId to identify the user. */
interface ServerTrackEventParams extends TrackEventParams {
    deviceId: string;
    userEmail?: string;
    userPhone?: string;
    clientIp?: string;
}
/** Server-side identify params require a deviceId. */
interface ServerIdentifyParams extends IdentifyParams {
    deviceId: string;
    clientIp?: string;
    geo?: Record<string, unknown>;
}
declare class AppCatServer {
    private _client;
    private _appId;
    private _configPromise;
    constructor(config: AppCatConfig);
    private _ensureAppId;
    trackEvent(params: ServerTrackEventParams): Promise<boolean>;
    identify(params: ServerIdentifyParams): Promise<boolean>;
    setTrackingConsent(params: {
        deviceId: string;
        granted: boolean;
    }): Promise<boolean>;
}

export { type AppCatConfig, AppCatServer, type IdentifyParams, type ServerIdentifyParams, type ServerTrackEventParams, type TrackEventParams };
