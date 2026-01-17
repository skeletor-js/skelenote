/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSyncServerUrl,
  setSyncServerUrl,
  clearSyncServerUrl,
  clearAllSyncSettings,
  isValidWebSocketUrl,
} from '../config';

describe('sync config', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('URL persistence', () => {
    it('should return null if no URL saved', () => {
      expect(getSyncServerUrl()).toBeNull();
    });

    it('should save and retrieve URL', () => {
      const url = 'wss://example.com';
      setSyncServerUrl(url);
      expect(getSyncServerUrl()).toBe(url);
    });

    it('should clear URL', () => {
      setSyncServerUrl('wss://test.com');
      clearSyncServerUrl();
      expect(getSyncServerUrl()).toBeNull();
    });
  });

  describe('clearAllSyncSettings', () => {
    it('should clear all sync related keys', () => {
      localStorage.setItem('skelenote:syncServerUrl', 'url');
      localStorage.setItem('skelenote:userId', 'user');
      localStorage.setItem('skelenote:deviceId', 'device');
      localStorage.setItem('other', 'keep');

      clearAllSyncSettings();

      expect(localStorage.getItem('skelenote:syncServerUrl')).toBeNull();
      expect(localStorage.getItem('skelenote:userId')).toBeNull();
      expect(localStorage.getItem('skelenote:deviceId')).toBeNull();
      expect(localStorage.getItem('other')).toBe('keep');
    });
  });

  describe('isValidWebSocketUrl', () => {
    it('should validate ws/wss URLs', () => {
      expect(isValidWebSocketUrl('ws://localhost:8080')).toBe(true);
      expect(isValidWebSocketUrl('wss://example.com')).toBe(true);
      expect(isValidWebSocketUrl('wss://sub.domain.co.uk:1234/path')).toBe(
        true
      );
    });

    it('should reject invalid URLs', () => {
      expect(isValidWebSocketUrl('http://example.com')).toBe(false);
      expect(isValidWebSocketUrl('ftp://example.com')).toBe(false);
      expect(isValidWebSocketUrl('not a url')).toBe(false);
      expect(isValidWebSocketUrl('')).toBe(false);
    });
  });
});
