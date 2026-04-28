/**
 * Public API contract tests for the browser SDK.
 *
 * These verify only the exported surface a consumer sees after install.
 * No implementation details are tested — those live in the closed-source
 * core test suite.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppCat } from '../browser';
import type {
  AppCatConfig,
  InitResponse,
  TrackEventParams,
  IdentifyParams,
} from '../browser';

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ matched: false }),
  text: () => Promise.resolve(''),
});
vi.stubGlobal('fetch', fetchMock);

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});

beforeEach(() => {
  fetchMock.mockClear();
  storage.clear();
});

/**
 * Initialise the SDK and discard any fetch calls triggered by init's
 * built-in resolve, so per-test fetch assertions only count subsequent
 * calls (trackEvent, identify, storeClick).
 */
async function initSdk(overrides: Partial<AppCatConfig> = {}): Promise<InitResponse> {
  const response = await AppCat.init({ appId: 'test-app', apiKey: 'test-key', ...overrides });
  fetchMock.mockClear();
  return response;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

describe('exports', () => {
  it('exports AppCat as an object', () => {
    expect(AppCat).toBeDefined();
    expect(typeof AppCat).toBe('object');
  });

  it('has init, trackEvent, identify, storeClick, getDeviceId', () => {
    const methods = ['init', 'trackEvent', 'identify', 'storeClick', 'getDeviceId'];
    for (const m of methods) {
      expect(typeof (AppCat as Record<string, unknown>)[m]).toBe('function');
    }
  });

  it('does not expose a separate resolve() method', () => {
    expect((AppCat as Record<string, unknown>).resolve).toBeUndefined();
  });

  it('has cookie reader helpers getFbc, getFbp, getTtp', () => {
    for (const m of ['getFbc', 'getFbp', 'getTtp']) {
      expect(typeof (AppCat as Record<string, unknown>)[m]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// init()
// ---------------------------------------------------------------------------

describe('init()', () => {
  it('returns an InitResponse with deepLinkParams: null on no match', async () => {
    const response = await AppCat.init({ appId: 'test-app', apiKey: 'test-key' });
    expect(response).toBeDefined();
    expect(response.matched).toBe(false);
    expect(response.deepLinkParams).toBeNull();
  });

  it('logs error with empty appId', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await AppCat.init({ appId: '', apiKey: 'key' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns matched response when core resolve reports a match', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          matched: true,
          matchMethod: 'ip_device',
          deepLinkParams: { screen: 'Promo', code: 'SUMMER' },
        }),
      text: () => Promise.resolve(''),
    });

    const response = await AppCat.init({ appId: 'test-app', apiKey: 'test-key' });
    expect(response.matched).toBe(true);
    expect(response.matchMethod).toBe('ip_device');
    expect(response.deepLinkParams).toEqual({ screen: 'Promo', code: 'SUMMER' });
  });

  it('produces a non-empty device ID after init', async () => {
    await initSdk();
    expect(AppCat.getDeviceId()).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// getDeviceId()
// ---------------------------------------------------------------------------

describe('getDeviceId()', () => {
  it('is stable across re-inits (persisted in localStorage)', async () => {
    await initSdk();
    const id1 = AppCat.getDeviceId();
    await initSdk();
    const id2 = AppCat.getDeviceId();
    expect(id1).toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// trackEvent()
// ---------------------------------------------------------------------------

describe('trackEvent()', () => {
  it('calls fetch with correct URL path', async () => {
    await initSdk();
    await AppCat.trackEvent({ name: 'Purchase' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/attribution/device/send-attribute');
  });

  it('sends event name, value, currency in body', async () => {
    await initSdk();
    await AppCat.trackEvent({ name: 'Purchase', value: 9.99, currency: 'USD' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.name).toBe('Purchase');
    expect(body.value).toBe(9.99);
    expect(body.currency).toBe('USD');
  });

  it('includes appId and deviceId in body', async () => {
    await initSdk();
    await AppCat.trackEvent({ name: 'PageView' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.appId).toBe('test-app');
    expect(body.deviceId).toBeTruthy();
  });

  it('sends POST with JSON content type and api key header', async () => {
    await initSdk();
    await AppCat.trackEvent({ name: 'Search' });

    const opts = fetchMock.mock.calls[0][1];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['x-api-key']).toBe('test-key');
  });
});

// ---------------------------------------------------------------------------
// identify()
// ---------------------------------------------------------------------------

describe('identify()', () => {
  it('sends user identity data', async () => {
    await initSdk();
    await AppCat.identify({ userId: 'u1', email: 'a@b.com', phone: '+1234' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.userId).toBe('u1');
    expect(body.email).toBe('a@b.com');
    expect(body.phone).toBe('+1234');
    expect(body.appId).toBe('test-app');
  });
});

// ---------------------------------------------------------------------------
// Cookie readers (no cookies set → undefined)
// ---------------------------------------------------------------------------

describe('cookie readers', () => {
  it('getFbc returns undefined when no cookie', () => {
    expect(AppCat.getFbc()).toBeUndefined();
  });

  it('getFbp returns undefined when no cookie', () => {
    expect(AppCat.getFbp()).toBeUndefined();
  });

  it('getTtp returns undefined when no cookie', () => {
    expect(AppCat.getTtp()).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Type compile-time checks (these just need to compile)
// ---------------------------------------------------------------------------

describe('type contracts', () => {
  it('AppCatConfig accepts expected shape', () => {
    const config: AppCatConfig = {
      appId: 'test',
      apiKey: 'test',
      debug: true,
    };
    expect(config.appId).toBe('test');
  });

  it('InitResponse accepts expected shape', () => {
    const response: InitResponse = {
      matched: true,
      matchMethod: 'ip_device',
      deepLinkParams: { screen: 'Home' },
    };
    expect(response.matched).toBe(true);
  });

  it('TrackEventParams accepts expected shape', () => {
    const params: TrackEventParams = {
      name: 'Purchase',
      value: 9.99,
      currency: 'USD',
      data: { plan: 'annual' },
      eventId: 'evt_123',
    };
    expect(params.name).toBe('Purchase');
  });

  it('IdentifyParams accepts expected shape', () => {
    const params: IdentifyParams = {
      userId: 'u1',
      email: 'a@b.com',
      phone: '+1',
      name: 'Test User',
    };
    expect(params.userId).toBe('u1');
  });
});
