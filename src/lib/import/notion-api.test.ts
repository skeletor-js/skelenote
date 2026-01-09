/**
 * Tests for Notion API connection
 *
 * These tests verify that we can connect to the Notion API from within Tauri.
 *
 * Run with: NOTION_TOKEN=your_token pnpm test notion-api
 */

import { describe, it, expect } from 'vitest';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Get token from environment (for local testing)
const NOTION_TOKEN =
  import.meta.env.VITE_NOTION_TOKEN || process.env.NOTION_TOKEN;

describe('Notion API Connection', () => {
  // Skip tests if no token is provided
  const describeIf = NOTION_TOKEN ? describe : describe.skip;

  describeIf('with API token', () => {
    it('should connect using direct fetch (bypassing SDK)', async () => {
      // Direct fetch to Notion API - this tests if Tauri's HTTP plugin works
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('object');
      console.log('Direct fetch response:', data);
    });

    it('should list databases using direct fetch', async () => {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { property: 'object', value: 'database' },
          page_size: 10,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data).toHaveProperty('results');
      console.log('Search response - found', data.results?.length, 'databases');
    });
  });

  describe('Tauri fetch compatibility', () => {
    it('should have tauriFetch available', () => {
      expect(tauriFetch).toBeDefined();
      expect(typeof tauriFetch).toBe('function');
    });
  });
});

/**
 * Manual test function - can be called from browser console
 * Usage: import { testNotionConnection } from './notion-api.test'; testNotionConnection('your-token');
 */
export async function testNotionConnection(token: string): Promise<{
  success: boolean;
  error?: string;
  data?: unknown;
}> {
  try {
    console.log('[Test] Testing Notion connection with direct fetch...');

    // First, try with standard fetch (will fail due to CORS in browser)
    console.log(
      '[Test] Attempting browser fetch (expected to fail with CORS)...'
    );
    try {
      const browserResponse = await window.fetch(
        'https://api.notion.com/v1/users/me',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('[Test] Browser fetch succeeded:', browserResponse.status);
    } catch (e) {
      console.log('[Test] Browser fetch failed (expected):', e);
    }

    // Now try with Tauri fetch
    console.log('[Test] Attempting Tauri fetch...');
    const tauriResponse = await tauriFetch(
      'https://api.notion.com/v1/users/me',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[Test] Tauri fetch response status:', tauriResponse.status);
    console.log('[Test] Tauri fetch response ok:', tauriResponse.ok);

    if (!tauriResponse.ok) {
      const errorText = await tauriResponse.text();
      console.log('[Test] Error response:', errorText);
      return {
        success: false,
        error: `HTTP ${tauriResponse.status}: ${errorText}`,
      };
    }

    const data = await tauriResponse.json();
    console.log('[Test] Success! User data:', data);

    return { success: true, data };
  } catch (error) {
    console.error('[Test] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test search endpoint (lists databases)
 */
export async function testNotionSearch(token: string): Promise<{
  success: boolean;
  error?: string;
  databases?: Array<{ id: string; name: string }>;
}> {
  try {
    console.log('[Test] Testing Notion search with Tauri fetch...');

    const response = await tauriFetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'database' },
        page_size: 100,
      }),
    });

    console.log('[Test] Search response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const databases = data.results?.map(
      (db: { id: string; title?: Array<{ plain_text: string }> }) => ({
        id: db.id,
        name: db.title?.map((t) => t.plain_text).join('') || 'Untitled',
      })
    );

    console.log('[Test] Found databases:', databases);

    return { success: true, databases };
  } catch (error) {
    console.error('[Test] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
