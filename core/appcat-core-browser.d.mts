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
/** Deep link parameters returned from resolve. */
type DeepLinkParams = Record<string, string | undefined>;
/** Opaque attribution data returned from resolve. */
type Attribution = Record<string, unknown>;
/** Result from a resolve call. */
interface ResolveResult {
    matched: boolean;
    matchMethod?: string;
    deepLinkParams?: DeepLinkParams;
    attribution?: Attribution;
}

interface SdkConfigResponse {
    success: boolean;
    config: {
        appId: string;
        name: string;
        platform: Record<string, unknown>;
    };
}
/** Shared HTTP client for AppCat API calls. Never throws into callers. */
declare class ApiClient {
    private _apiKey;
    private _debug;
    private _timeoutMs;
    constructor(config: Pick<AppCatConfig, 'apiKey' | 'debug'>);
    get baseUrl(): string;
    fetchSdkConfig(): Promise<SdkConfigResponse | null>;
    post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T | null>;
    /**
     * Wrap `fetch` with an AbortController-backed timeout. Returns `null` when the
     * request is aborted, `fetch` throws, or `AbortController` is not available
     * and the underlying fetch rejects.
     */
    private _fetchWithTimeout;
}

/** TEST-ONLY: flush the gate without going through `resolve()`. */
declare function __testOnlyMarkAttributionReady(): void;
/** TEST-ONLY: reset the gate to pending between tests. */
declare function __testOnlyResetAttributionReady(): void;
declare const AppCat: {
    _client: ApiClient | null;
    _config: (AppCatConfig & {
        appId: string;
    }) | null;
    _deviceId: string;
    _initPromise: Promise<void> | null;
    init(config: AppCatConfig): void;
    trackEvent(params: TrackEventParams): Promise<void>;
    identify(params: IdentifyParams): Promise<void>;
    setTrackingConsent(granted: boolean): Promise<void>;
    storeClick(queryParams?: Record<string, string>): Promise<void>;
    resolve(): Promise<ResolveResult | null>;
    getDeviceId(): string;
    getFbc(): string | undefined;
    getFbp(): string | undefined;
    getTtp(): string | undefined;
};

export { AppCat, type AppCatConfig, type Attribution, type DeepLinkParams, type EventName, type IdentifyParams, type ResolveResult, type TrackEventParams, __testOnlyMarkAttributionReady, __testOnlyResetAttributionReady };
