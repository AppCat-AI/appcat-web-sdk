# @appcat/web-sdk

Server-side attribution SDK for web apps. Track conversions via Meta CAPI, TikTok Events API, and more. Resolve deferred deep links to route users to the right content. Works in browser and Node.js.

## Overview

- Track standard and custom events across ad platforms (Meta CAPI, TikTok Events API)
- Track revenue events with currency and value
- Resolve deferred deep links and route users with params returned from `init()`
- Link user identity to attribution profiles
- Browser and Node.js (server-side) entry points

## Get an API Key

You need an AppCat API key (and optionally an App ID) before the SDK can run.

1. Sign up at [appcat.ai](https://appcat.ai).
2. Click **+ New Product** in the top right and create your app (select **Web**).
3. In the sidebar, open **SDK Guides → API Key Management**.
4. Copy your **API Key**. The **App ID** is optional — it can be resolved automatically from the API key.

Use a browser-safe AppCat key in client bundles. Keep server-only keys server-side.

## Installation

```bash
npm install @appcat/web-sdk
```

## Requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 16+ (for server usage) |
| Browser | Any modern browser with `fetch` support |
| TypeScript | 5.0+ (optional, types included) |

## Browser SDK

Use the browser SDK on your landing pages and web apps to track events and resolve deferred deep links.

### Getting Started

Add credentials to your environment:

```bash
APPCAT_APP_ID=your-app-id
APPCAT_API_KEY=your-api-key
```

Use a browser-safe AppCat key in client bundles. Do not expose private server-only keys in browser code.

#### 1. Init

Configure the SDK and resolve any pending deferred deep link in one call. The returned `deepLinkParams` are the query params from the matched ad click URL — route the user there on first open.

```typescript
import { AppCat } from '@appcat/web-sdk';

const { deepLinkParams } = await AppCat.init({
  appId: process.env.APPCAT_APP_ID, // optional; resolved from apiKey if omitted
  apiKey: process.env.APPCAT_API_KEY,
});

// e.g. { screen: 'Promo', promoCode: 'SUMMER25' }
if (deepLinkParams) {
  router.push({ pathname: deepLinkParams.screen, query: deepLinkParams });
}
```

#### 2. Identify (optional)

Enrich the attribution profile with user PII for stronger ad platform matching. Call after login or signup — not required for core attribution to work but helps drive strong signal back to ad platforms, so highly encouraged if you have it.

```typescript
await AppCat.identify({ email, phone, userId });
```

### Event Tracking

```typescript
await AppCat.trackEvent({
  name: 'Purchase',
  value: 29.99,
  currency: 'USD',
  data: { plan: 'annual' },
});

await AppCat.trackEvent({ name: 'ViewContent', data: { page: '/pricing' } });
await AppCat.trackEvent({ name: 'CompleteRegistration' });
```

### Utility Methods

```typescript
const deviceId = AppCat.getDeviceId(); // Stable browser device ID
```

## Server SDK (Node.js)

Use the server SDK for webhook handlers, payment callbacks, and background jobs where you need to track events server-side.

```typescript
import { AppCatServer } from '@appcat/web-sdk/server';

const appcat = new AppCatServer({
  appId: process.env.APPCAT_APP_ID,
  apiKey: process.env.APPCAT_API_KEY,
});
```

### Server-Side Event Tracking

```typescript
await appcat.trackEvent({
  name: 'Purchase',
  deviceId: 'user-device-id',
  value: 29.99,
  currency: 'USD',
  data: { plan: 'annual' },
  userEmail: 'user@example.com',   // hashed server-side
  userPhone: '+1234567890',         // hashed server-side
});
```

### Server-Side User Identification

```typescript
await appcat.identify({
  deviceId: 'user-device-id',
  userId: 'user_123',
  email: 'user@example.com',
  geo: { city: 'San Francisco', countryCode: 'US' },
});
```

## API Reference

### Browser — `AppCat`

#### `AppCat.init(config)`

Initialize the SDK and resolve any pending deferred deep link. Must be called before any other method.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.appId` | `string` | No | Your AppCat application ID. Resolved from `apiKey` if omitted |
| `config.apiKey` | `string` | Yes | API key from the AppCat dashboard |
| `config.debug` | `boolean` | No | Enable debug logging (default: `false`) |

**Returns:** `Promise<InitResponse>`

| Field | Type | Description |
|-------|------|-------------|
| `matched` | `boolean` | Whether a click match was found for this device |
| `matchMethod` | `string` | How the match was made (e.g. `"ip_device"`) |
| `deepLinkParams` | `Record<string, string \| undefined> \| null` | Query params from the matched ad click URL, or `null` on no match |

---

#### `AppCat.trackEvent(params)`

Track a conversion event via server-side APIs (Meta CAPI, TikTok Events API).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.name` | `EventName` | Yes | Event name (see available events below) |
| `params.data` | `Record<string, unknown>` | No | Custom event data |
| `params.value` | `number` | No | Monetary value |
| `params.currency` | `string` | No | ISO 4217 currency code (e.g. `"USD"`) |
| `params.eventId` | `string` | No | Unique ID for client/server deduplication |

**Returns:** `Promise<void>`

---

#### `AppCat.identify(params)`

Link user identity to the attribution profile.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.userId` | `string` | No | Your internal user ID |
| `params.email` | `string` | No | User email (hashed server-side) |
| `params.phone` | `string` | No | User phone (hashed server-side) |
| `params.name` | `string` | No | User display name |

**Returns:** `Promise<void>`

---

#### `AppCat.getDeviceId()`

Get the stable browser device ID (stored in localStorage).

**Returns:** `string`

---

#### `AppCat.setTrackingConsent(granted)`

Record the user's tracking-consent choice after ATT, GDPR, or an in-app privacy setting. When `granted` is `false`, AppCat avoids forwarding certain PII fields to ad networks on your behalf.

**Returns:** `Promise<void>`

---

#### `AppCat.storeClick(queryParams?)`

Store ad click query params on a landing page so AppCat can match the user later.

**Returns:** `Promise<void>`

---

#### `AppCat.getFbc()`, `AppCat.getFbp()`, `AppCat.getTtp()`

Read cached browser ad-platform identifiers when available.

**Returns:** `string | undefined`

---

### Server — `AppCatServer`

#### `new AppCatServer(config)`

Create a server-side SDK instance. Same `config` as the browser SDK.

---

#### `appcat.setTrackingConsent(params)`

Record tracking consent server-side for a known AppCat `deviceId`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.deviceId` | `string` | Yes | Device ID from the client SDK |
| `params.granted` | `boolean` | Yes | Whether tracking consent is granted |

**Returns:** `Promise<boolean>`

---

#### `appcat.trackEvent(params)`

Track a server-side conversion event.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.name` | `EventName` | Yes | Event name |
| `params.deviceId` | `string` | Yes | Device ID from client SDK |
| `params.data` | `Record<string, unknown>` | No | Custom event data |
| `params.value` | `number` | No | Monetary value |
| `params.currency` | `string` | No | Currency code |
| `params.eventId` | `string` | No | Deduplication ID |
| `params.userEmail` | `string` | No | Email for server-side hashing |
| `params.userPhone` | `string` | No | Phone for server-side hashing |
| `params.clientIp` | `string` | No | Client IP for attribution |

**Returns:** `Promise<boolean>`

---

#### `appcat.identify(params)`

Link user identity server-side.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.deviceId` | `string` | Yes | Device ID from client SDK |
| `params.userId` | `string` | No | Internal user ID |
| `params.email` | `string` | No | User email |
| `params.phone` | `string` | No | User phone |
| `params.name` | `string` | No | User display name |
| `params.clientIp` | `string` | No | Client IP address |
| `params.geo` | `Record<string, unknown>` | No | Geo data if available |

**Returns:** `Promise<boolean>`

## Available Event Types

| Event Name | Description |
|------------|-------------|
| `PageView` | Page viewed |
| `ViewContent` | User viewed content |
| `AddToCart` | Item added to cart |
| `InitiateCheckout` | Checkout started |
| `StartTrial` | Free trial started |
| `Subscribe` | Subscription started |
| `Purchase` | Purchase completed |
| `CompleteRegistration` | Registration completed |
| `Search` | Search performed |

Custom event names are also supported as any string value.

## License

MIT — see [LICENSE](./LICENSE) for details.
