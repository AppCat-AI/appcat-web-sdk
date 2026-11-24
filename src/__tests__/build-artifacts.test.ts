/**
 * Build artifact integration tests.
 *
 * Verifies the core bundles produced by build-and-distribute.sh
 * are structurally valid and export the expected public API.
 * No implementation details are checked — only that the artifacts
 * exist, are loadable, and expose the correct surface.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const CORE_DIR = path.resolve(__dirname, '../../core');

// ---------------------------------------------------------------------------
// File existence — core bundles must exist after build-and-distribute.sh
// ---------------------------------------------------------------------------

describe('core bundle files exist', () => {
  const expectedFiles = [
    'appcat-core-browser.js',
    'appcat-core-browser.mjs',
    'appcat-core-browser.d.ts',
    'appcat-core-browser.d.mts',
    'appcat-core-server.js',
    'appcat-core-server.mjs',
    'appcat-core-server.d.ts',
    'appcat-core-server.d.mts',
  ];

  for (const file of expectedFiles) {
    it(`${file} exists`, () => {
      const full = path.join(CORE_DIR, file);
      expect(fs.existsSync(full)).toBe(true);
    });
  }

  it('bundles are non-empty', () => {
    for (const file of expectedFiles) {
      const stat = fs.statSync(path.join(CORE_DIR, file));
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// CJS browser bundle is requireable
// ---------------------------------------------------------------------------

describe('CJS browser bundle', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../core/appcat-core-browser.js');

  it('exports AppCat object', () => {
    expect(mod.AppCat).toBeDefined();
    expect(typeof mod.AppCat).toBe('object');
  });

  it('AppCat has expected public methods', () => {
    const methods = ['init', 'trackEvent', 'identify', 'storeClick', 'resolve', 'getDeviceId', 'getFbc', 'getFbp', 'getTtp', 'getGclid'];
    for (const m of methods) {
      expect(typeof mod.AppCat[m]).toBe('function');
    }
  });
});

// ---------------------------------------------------------------------------
// CJS server bundle is requireable
// ---------------------------------------------------------------------------

describe('CJS server bundle', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../../core/appcat-core-server.js');

  it('exports AppCatServer constructor', () => {
    expect(typeof mod.AppCatServer).toBe('function');
  });

  it('instance has expected methods', () => {
    const instance = new mod.AppCatServer({ appId: 'a', apiKey: 'k' });
    expect(typeof instance.trackEvent).toBe('function');
    expect(typeof instance.identify).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Type declarations contain expected exports
// ---------------------------------------------------------------------------

describe('type declarations', () => {
  it('browser d.ts exports AppCat and type interfaces', () => {
    const dts = fs.readFileSync(path.join(CORE_DIR, 'appcat-core-browser.d.ts'), 'utf-8');
    expect(dts).toContain('AppCat');
    expect(dts).toContain('AppCatConfig');
    expect(dts).toContain('TrackEventParams');
    expect(dts).toContain('IdentifyParams');
    expect(dts).toContain('ResolveResult');
    expect(dts).toContain('EventName');
  });

  it('server d.ts exports AppCatServer and server params', () => {
    const dts = fs.readFileSync(path.join(CORE_DIR, 'appcat-core-server.d.ts'), 'utf-8');
    expect(dts).toContain('AppCatServer');
    expect(dts).toContain('ServerTrackEventParams');
    expect(dts).toContain('ServerIdentifyParams');
    expect(dts).toContain('AppCatConfig');
  });
});

// ---------------------------------------------------------------------------
// Minification — bundles should NOT contain internal function names
// (sanity check that obfuscation is working)
// ---------------------------------------------------------------------------

describe('obfuscation sanity', () => {
  it('browser bundle does not expose raw private field names', () => {
    const code = fs.readFileSync(path.join(CORE_DIR, 'appcat-core-browser.js'), 'utf-8');
    expect(code).not.toContain('_baseUrl');
    expect(code).not.toContain('_apiKey');
    expect(code).not.toContain('_debug');
    expect(code).not.toContain('_generateEventId');
    expect(code).not.toContain('_getCookie');
    expect(code).not.toContain('collectBrowserContext');
  });

  it('server bundle does not expose raw private field names', () => {
    const code = fs.readFileSync(path.join(CORE_DIR, 'appcat-core-server.js'), 'utf-8');
    expect(code).not.toContain('_baseUrl');
    expect(code).not.toContain('_apiKey');
    expect(code).not.toContain('_debug');
  });
});
