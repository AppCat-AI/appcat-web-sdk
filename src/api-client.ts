import type { AppCatConfig } from './types';

const DEFAULT_API_BASE = 'https://appcat.ai/api';

/** Shared HTTP client for AppCat API calls. */
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private debug: boolean;

  constructor(config: AppCatConfig) {
    this.baseUrl = (config.apiBaseUrl || DEFAULT_API_BASE).replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.debug = config.debug ?? false;
  }

  async post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;

    if (this.debug) {
      console.log(`[AppCat] POST ${path}`, body);
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (this.debug) {
          console.error(`[AppCat] ${path} failed:`, res.status, await res.text().catch(() => ''));
        }
        return null;
      }

      return (await res.json()) as T;
    } catch (error) {
      if (this.debug) {
        console.error(`[AppCat] ${path} error:`, error);
      }
      return null;
    }
  }
}
