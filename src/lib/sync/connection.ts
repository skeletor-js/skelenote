/**
 * Connection Manager
 *
 * Handles reconnection with exponential backoff.
 */

export interface ReconnectionConfig {
  /** Initial delay before first reconnect attempt (ms) */
  initialDelay: number;
  /** Maximum delay between reconnect attempts (ms) */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  multiplier: number;
}

const DEFAULT_CONFIG: ReconnectionConfig = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  multiplier: 2,
};

export class ConnectionManager {
  private retryCount = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private config: ReconnectionConfig;

  constructor(config?: Partial<ReconnectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate the next delay using exponential backoff
   */
  getNextDelay(): number {
    const delay = Math.min(
      this.config.initialDelay *
        Math.pow(this.config.multiplier, this.retryCount),
      this.config.maxDelay
    );
    this.retryCount++;
    return delay;
  }

  /**
   * Get the current retry count
   */
  getRetryCount(): number {
    return this.retryCount;
  }

  /**
   * Reset the retry counter (call on successful connection)
   */
  resetRetries(): void {
    this.retryCount = 0;
    this.cancelReconnect();
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect(callback: () => void): number {
    this.cancelReconnect();
    const delay = this.getNextDelay();
    this.reconnectTimeout = setTimeout(callback, delay);
    return delay;
  }

  /**
   * Cancel any pending reconnection attempt
   */
  cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Check if a reconnection is scheduled
   */
  isReconnectScheduled(): boolean {
    return this.reconnectTimeout !== null;
  }
}
