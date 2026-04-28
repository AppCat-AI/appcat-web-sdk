/**
 * Public API contract tests for the server SDK.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppCatServer } from '../server';
import type {
  ServerTrackEventParams,
  ServerIdentifyParams,
  AppCatConfig,
} from '../server';

const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true }),
  text: () => Promise.resolve(''),
});
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockClear();
});

function createServer(overrides: Partial<AppCatConfig> = {}): InstanceType<typeof AppCatServer> {
  return new AppCatServer({ appId: 'srv-app', apiKey: 'srv-key', ...overrides });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

describe('exports', () => {
  it('exports AppCatServer as a class/constructor', () => {
    expect(typeof AppCatServer).toBe('function');
  });

  it('instance has trackEvent and identify methods', () => {
    const server = createServer();
    expect(typeof server.trackEvent).toBe('function');
    expect(typeof server.identify).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// trackEvent()
// ---------------------------------------------------------------------------

describe('trackEvent()', () => {
  it('sends POST to the events endpoint', async () => {
    const server = createServer();
    await server.trackEvent({
      name: 'Purchase',
      deviceId: 'device_abc',
      value: 9.99,
      currency: 'USD',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/attribution/device/send-attribute');
    expect(opts.method).toBe('POST');
    expect(opts.headers['x-api-key']).toBe('srv-key');

    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Purchase');
    expect(body.deviceId).toBe('device_abc');
    expect(body.value).toBe(9.99);
  });

  it('returns true on success', async () => {
    const server = createServer();
    const result = await server.trackEvent({ name: 'Login', deviceId: 'd1' });
    expect(result).toBe(true);
  });

  it('returns false on failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('bad') });
    const server = createServer();
    const result = await server.trackEvent({ name: 'Login', deviceId: 'd1' });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identify()
// ---------------------------------------------------------------------------

describe('identify()', () => {
  it('sends POST with user identity', async () => {
    const server = createServer();
    await server.identify({
      deviceId: 'd1',
      userId: 'u1',
      email: 'a@b.com',
      phone: '+1234',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.deviceId).toBe('d1');
    expect(body.userId).toBe('u1');
    expect(body.email).toBe('a@b.com');
  });

  it('returns true on success', async () => {
    const server = createServer();
    const result = await server.identify({ deviceId: 'd1', userId: 'u1' });
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------

describe('api base URL', () => {
  it('ignores apiBaseUrl if a consumer passes it at runtime', async () => {
    const server = new AppCatServer({
      appId: 'srv-app',
      apiKey: 'srv-key',
      apiBaseUrl: 'https://custom.api.com',
    } as unknown as AppCatConfig);
    await server.trackEvent({ name: 'PageView', deviceId: 'd1' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/appcat\.ai\/api/);
  });
});

// ---------------------------------------------------------------------------
// Type compile-time checks
// ---------------------------------------------------------------------------

describe('type contracts', () => {
  it('ServerTrackEventParams extends TrackEventParams with deviceId', () => {
    const params: ServerTrackEventParams = {
      name: 'Purchase',
      deviceId: 'device_1',
      value: 9.99,
      currency: 'USD',
      userEmail: 'a@b.com',
      clientIp: '1.2.3.4',
    };
    expect(params.deviceId).toBe('device_1');
  });

  it('ServerIdentifyParams extends IdentifyParams with deviceId', () => {
    const params: ServerIdentifyParams = {
      deviceId: 'device_1',
      userId: 'u1',
      clientIp: '1.2.3.4',
      geo: { country: 'US' },
    };
    expect(params.deviceId).toBe('device_1');
  });
});
