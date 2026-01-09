/**
 * Notion API Client
 *
 * Provides a direct interface to the Notion API for importing data.
 * Uses Tauri's HTTP plugin to bypass browser CORS restrictions.
 *
 * NOTE: We intentionally avoid the @notionhq/client SDK because its internal
 * fetch usage is incompatible with Tauri's HTTP plugin streaming API.
 * Direct fetch calls work correctly.
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Token bucket rate limiter for Notion API requests
 * Notion allows 3 requests per second average
 *
 * This implementation allows concurrent requests while respecting the rate limit.
 * Uses a token bucket algorithm with 3 tokens per second refill rate.
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens = 3;
  private readonly refillRate = 3; // tokens per second
  private readonly minTokens = 1;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;

  constructor() {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refillTokens();

      if (this.tokens >= this.minTokens) {
        this.tokens -= 1;
        const next = this.queue.shift();
        if (next) {
          next.resolve();
        }
      } else {
        // Wait for tokens to refill
        const waitTime =
          ((this.minTokens - this.tokens) / this.refillRate) * 1000;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(50, waitTime))
        );
      }
    }

    this.processing = false;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.processQueue();
    });
  }
}

const rateLimiter = new RateLimiter();

/**
 * Progress callback for long-running operations
 */
export interface ProgressCallback {
  (current: number, total: number, message: string): void;
}

/**
 * Notion database with schema information
 */
export interface NotionDatabaseInfo {
  id: string;
  name: string;
  icon: string | null;
  properties: DatabasePropertySchema[];
  pageCount?: number;
}

/**
 * Database property schema from Notion
 */
export interface DatabasePropertySchema {
  id: string;
  name: string;
  type: string;
  config?: {
    options?: Array<{ id: string; name: string; color: string }>;
    relation?: { database_id: string; type: string };
  };
}

/**
 * Notion page with properties
 */
export interface NotionPageInfo {
  id: string;
  title: string;
  databaseId: string | null;
  properties: Record<string, NotionPropertyValue>;
  icon: string | null;
  createdTime: string;
  lastEditedTime: string;
}

/**
 * Property value from Notion API
 */
export interface NotionPropertyValue {
  type: string;
  value: unknown;
}

/**
 * Block from Notion API (simplified)
 */
export interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

/**
 * Notion API error
 */
export class NotionAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'NotionAPIError';
  }
}

/**
 * Notion API client using direct fetch
 */
export class NotionClient {
  constructor(private token: string) {}

  private async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: unknown;
    } = {}
  ): Promise<T> {
    await rateLimiter.acquire();

    const { method = 'GET', body } = options;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await tauriFetch(
      `${NOTION_API_BASE}${endpoint}`,
      fetchOptions
    );

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorCode: string | undefined;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code;
      } catch {
        // Ignore JSON parse errors for error response
      }

      throw new NotionAPIError(errorMessage, response.status, errorCode);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get current user info (tests authentication)
   */
  async getMe(): Promise<{ id: string; name: string; type: string }> {
    return this.request('/users/me');
  }

  /**
   * Search for databases and pages
   */
  async search(options: {
    query?: string;
    filter?: { property: string; value: string };
    start_cursor?: string;
    page_size?: number;
  }): Promise<{
    results: unknown[];
    has_more: boolean;
    next_cursor: string | null;
  }> {
    return this.request('/search', {
      method: 'POST',
      body: options,
    });
  }

  /**
   * Query a database for pages
   */
  async queryDatabase(
    databaseId: string,
    options: {
      start_cursor?: string;
      page_size?: number;
      filter?: unknown;
      sorts?: unknown[];
    } = {}
  ): Promise<{
    results: unknown[];
    has_more: boolean;
    next_cursor: string | null;
  }> {
    return this.request(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: options,
    });
  }

  /**
   * Get a database schema
   */
  async getDatabase(databaseId: string): Promise<unknown> {
    return this.request(`/databases/${databaseId}`);
  }

  /**
   * Get block children (page content)
   */
  async getBlockChildren(
    blockId: string,
    options: {
      start_cursor?: string;
      page_size?: number;
    } = {}
  ): Promise<{
    results: NotionBlock[];
    has_more: boolean;
    next_cursor: string | null;
  }> {
    const params = new URLSearchParams();
    if (options.start_cursor) params.set('start_cursor', options.start_cursor);
    if (options.page_size) params.set('page_size', String(options.page_size));

    const query = params.toString();
    const endpoint = `/blocks/${blockId}/children${query ? `?${query}` : ''}`;

    return this.request(endpoint);
  }
}

/**
 * Create a Notion API client
 */
export function createNotionClient(token: string): NotionClient {
  return new NotionClient(token);
}

/**
 * Test connection by attempting to get current user
 */
export async function testConnection(
  client: NotionClient
): Promise<{ success: boolean; error?: string }> {
  try {
    await client.getMe();
    return { success: true };
  } catch (error) {
    if (error instanceof NotionAPIError) {
      if (error.status === 401) {
        return {
          success: false,
          error: 'Invalid token. Please check your integration token.',
        };
      }
      return { success: false, error: error.message };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Notion connection error:', error);
    return {
      success: false,
      error: `Failed to connect to Notion: ${errorMessage}`,
    };
  }
}

/**
 * List all accessible databases
 */
export async function listDatabases(
  client: NotionClient,
  onProgress?: ProgressCallback
): Promise<NotionDatabaseInfo[]> {
  const databases: NotionDatabaseInfo[] = [];
  let cursor: string | undefined;
  let page = 0;

  do {
    onProgress?.(page, -1, 'Fetching databases...');

    const response = await client.search({
      filter: { property: 'object', value: 'database' },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      const db = result as {
        id: string;
        title: Array<{ plain_text: string }>;
        icon: {
          type: string;
          emoji?: string;
          external?: { url: string };
          file?: { url: string };
        } | null;
        properties: Record<
          string,
          { id: string; type: string; [key: string]: unknown }
        >;
      };

      databases.push(parseDatabaseInfo(db));
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
    page++;
  } while (cursor);

  // Get page counts for each database
  for (let i = 0; i < databases.length; i++) {
    onProgress?.(
      i + 1,
      databases.length,
      `Counting pages in ${databases[i].name}...`
    );
    databases[i].pageCount = await countDatabasePages(client, databases[i].id);
  }

  return databases;
}

/**
 * Count pages in a database
 */
async function countDatabasePages(
  client: NotionClient,
  databaseId: string
): Promise<number> {
  try {
    const response = await client.queryDatabase(databaseId, { page_size: 1 });
    return response.results.length > 0 ? -1 : 0; // -1 means "has pages"
  } catch {
    return 0;
  }
}

/**
 * Query all pages from a database with pagination
 */
export async function queryDatabase(
  client: NotionClient,
  databaseId: string,
  onProgress?: ProgressCallback
): Promise<NotionPageInfo[]> {
  const pages: NotionPageInfo[] = [];
  let cursor: string | undefined;
  let batch = 0;

  do {
    onProgress?.(pages.length, -1, `Fetching pages (batch ${batch + 1})...`);

    const response = await client.queryDatabase(databaseId, {
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      const pageResult = result as {
        id: string;
        properties: Record<string, unknown>;
        icon: unknown;
        created_time: string;
        last_edited_time: string;
      };
      pages.push(parsePageInfo(pageResult, databaseId));
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
    batch++;
  } while (cursor);

  return pages;
}

/**
 * Get all blocks from a page with parallel child fetching
 *
 * This version collects all blocks first, then fetches children in parallel
 * batches for better performance.
 */
export async function getPageBlocks(
  client: NotionClient,
  pageId: string,
  onProgress?: ProgressCallback
): Promise<NotionBlock[]> {
  const allBlocks: NotionBlock[] = [];
  let cursor: string | undefined;

  // Step 1: Fetch all top-level blocks
  do {
    onProgress?.(allBlocks.length, -1, 'Fetching blocks...');

    const response = await client.getBlockChildren(pageId, {
      start_cursor: cursor,
      page_size: 100,
    });

    allBlocks.push(...response.results);

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
  } while (cursor);

  // Step 2: Find all blocks with children
  const blocksWithChildren = allBlocks.filter((b) => b.has_children);

  if (blocksWithChildren.length === 0) {
    return allBlocks;
  }

  // Step 3: Fetch children in parallel batches
  const CHILD_BATCH_SIZE = 3; // Fetch 3 child blocks at a time
  const childResults: NotionBlock[] = [];

  for (let i = 0; i < blocksWithChildren.length; i += CHILD_BATCH_SIZE) {
    const batch = blocksWithChildren.slice(i, i + CHILD_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((block) => getPageBlocks(client, block.id, onProgress))
    );

    for (const children of batchResults) {
      childResults.push(...children);
    }
  }

  // Return all blocks with children appended
  // Note: Block order is preserved for top-level, children follow their parent batches
  return [...allBlocks, ...childResults];
}

/**
 * List standalone pages (not in databases)
 */
export async function listStandalonePages(
  client: NotionClient,
  onProgress?: ProgressCallback
): Promise<NotionPageInfo[]> {
  const pages: NotionPageInfo[] = [];
  let cursor: string | undefined;
  let page = 0;

  do {
    onProgress?.(page, -1, 'Fetching pages...');

    const response = await client.search({
      filter: { property: 'object', value: 'page' },
      start_cursor: cursor,
      page_size: 100,
    });

    for (const result of response.results) {
      const pageResult = result as {
        id: string;
        parent: { type: string; database_id?: string };
        properties: Record<string, unknown>;
        icon: unknown;
        created_time: string;
        last_edited_time: string;
      };

      // Only include pages not in a database
      if (pageResult.parent.type !== 'database_id') {
        pages.push(parsePageInfo(pageResult, null));
      }
    }

    cursor = response.has_more
      ? (response.next_cursor ?? undefined)
      : undefined;
    page++;
  } while (cursor);

  return pages;
}

// ============================================================================
// Parsers
// ============================================================================

function parseDatabaseInfo(db: {
  id: string;
  title: Array<{ plain_text: string }>;
  icon: {
    type: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  } | null;
  properties: Record<
    string,
    { id: string; type: string; [key: string]: unknown }
  >;
}): NotionDatabaseInfo {
  const title = db.title.map((t) => t.plain_text).join('') || 'Untitled';
  const icon = parseIcon(db.icon);
  const properties: DatabasePropertySchema[] = [];

  for (const [name, prop] of Object.entries(db.properties)) {
    properties.push({
      id: prop.id,
      name,
      type: prop.type,
      config: parsePropertyConfig(prop),
    });
  }

  return {
    id: db.id,
    name: title,
    icon,
    properties,
  };
}

function parseIcon(
  icon:
    | {
        type: string;
        emoji?: string;
        external?: { url: string };
        file?: { url: string };
      }
    | null
    | unknown
): string | null {
  if (!icon || typeof icon !== 'object') return null;
  const i = icon as {
    type: string;
    emoji?: string;
    external?: { url: string };
    file?: { url: string };
  };
  if (i.type === 'emoji' && i.emoji) return i.emoji;
  if (i.type === 'external' && i.external) return i.external.url;
  if (i.type === 'file' && i.file) return i.file.url;
  return null;
}

function parsePropertyConfig(prop: {
  type: string;
  [key: string]: unknown;
}): DatabasePropertySchema['config'] {
  switch (prop.type) {
    case 'select': {
      const selectProp = prop as unknown as {
        select: { options: Array<{ id: string; name: string; color: string }> };
      };
      return { options: selectProp.select?.options ?? [] };
    }
    case 'multi_select': {
      const multiProp = prop as unknown as {
        multi_select: {
          options: Array<{ id: string; name: string; color: string }>;
        };
      };
      return { options: multiProp.multi_select?.options ?? [] };
    }
    case 'status': {
      const statusProp = prop as unknown as {
        status: {
          options: Array<{ id: string; name: string; color: string }>;
          groups: Array<{ option_ids: string[] }>;
        };
      };
      return { options: statusProp.status?.options ?? [] };
    }
    case 'relation': {
      const relProp = prop as unknown as {
        relation: { database_id: string; type: string };
      };
      return {
        relation: {
          database_id: relProp.relation?.database_id ?? '',
          type: relProp.relation?.type ?? '',
        },
      };
    }
    default:
      return undefined;
  }
}

function parsePageInfo(
  page: {
    id: string;
    properties: Record<string, unknown>;
    icon: unknown;
    created_time: string;
    last_edited_time: string;
  },
  databaseId: string | null
): NotionPageInfo {
  const title = extractPageTitle(page.properties);
  const properties: Record<string, NotionPropertyValue> = {};

  for (const [name, prop] of Object.entries(page.properties)) {
    if (prop && typeof prop === 'object' && 'type' in prop) {
      const p = prop as { type: string };
      properties[name] = {
        type: p.type,
        value: extractPropertyValue(prop),
      };
    }
  }

  return {
    id: page.id,
    title,
    databaseId,
    properties,
    icon: parseIcon(page.icon),
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}

function extractPageTitle(properties: Record<string, unknown>): string {
  for (const prop of Object.values(properties)) {
    if (prop && typeof prop === 'object' && 'type' in prop) {
      const p = prop as { type: string; title?: Array<{ plain_text: string }> };
      if (p.type === 'title' && p.title && p.title.length > 0) {
        return p.title.map((t) => t.plain_text).join('');
      }
    }
  }
  return 'Untitled';
}

function extractPropertyValue(prop: unknown): unknown {
  if (!prop || typeof prop !== 'object' || !('type' in prop)) return null;

  const p = prop as Record<string, unknown>;
  const type = p.type as string;

  switch (type) {
    case 'title': {
      const items = p.title as Array<{ plain_text: string }> | undefined;
      return items?.map((t) => t.plain_text).join('') ?? '';
    }
    case 'rich_text': {
      const items = p.rich_text as Array<{ plain_text: string }> | undefined;
      return items?.map((t) => t.plain_text).join('') ?? '';
    }
    case 'number':
      return p.number;
    case 'select': {
      const select = p.select as { name: string } | null;
      return select?.name ?? null;
    }
    case 'multi_select': {
      const items = p.multi_select as Array<{ name: string }> | undefined;
      return items?.map((s) => s.name) ?? [];
    }
    case 'status': {
      const status = p.status as { name: string } | null;
      return status?.name ?? null;
    }
    case 'date':
      return p.date;
    case 'checkbox':
      return p.checkbox;
    case 'url':
      return p.url;
    case 'email':
      return p.email;
    case 'phone_number':
      return p.phone_number;
    case 'relation': {
      const items = p.relation as Array<{ id: string }> | undefined;
      return items?.map((r) => r.id) ?? [];
    }
    case 'people': {
      const items = p.people as
        | Array<{ name?: string; id: string }>
        | undefined;
      return items?.map((person) => person.name ?? person.id) ?? [];
    }
    case 'files': {
      const items = p.files as
        | Array<{
            type: string;
            external?: { url: string };
            file?: { url: string };
          }>
        | undefined;
      return (
        items
          ?.map((f) => (f.type === 'external' ? f.external?.url : f.file?.url))
          .filter(Boolean) ?? []
      );
    }
    case 'formula': {
      const formula = p.formula as {
        type: string;
        string?: string;
        number?: number;
        boolean?: boolean;
        date?: unknown;
      };
      switch (formula?.type) {
        case 'string':
          return formula.string;
        case 'number':
          return formula.number;
        case 'boolean':
          return formula.boolean;
        case 'date':
          return formula.date;
        default:
          return null;
      }
    }
    case 'rollup': {
      const rollup = p.rollup as {
        type: string;
        number?: number;
        date?: unknown;
        array?: unknown[];
      };
      switch (rollup?.type) {
        case 'number':
          return rollup.number;
        case 'date':
          return rollup.date;
        case 'array':
          return rollup.array;
        default:
          return null;
      }
    }
    case 'created_time':
      return p.created_time;
    case 'last_edited_time':
      return p.last_edited_time;
    case 'created_by':
    case 'last_edited_by': {
      const user = p[type] as { name?: string; id: string } | undefined;
      return user?.name ?? user?.id ?? null;
    }
    default:
      return null;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof NotionAPIError) {
        if (error.status === 429) {
          // Rate limited - wait longer
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        // Don't retry other API errors
        throw error;
      }

      // Retry network errors
      if (attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}
