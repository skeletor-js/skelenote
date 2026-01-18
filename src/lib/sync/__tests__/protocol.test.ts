import { describe, it, expect } from 'vitest';
import {
  MessageType,
  encodeMessage,
  decodeMessage,
  encodeJsonPayload,
  decodeJsonPayload,
  isValidMessageType,
  isDeviceManagementMessage,
} from '../protocol';

describe('Sync Protocol', () => {
  describe('Message Encoding/Decoding', () => {
    it('should encode and decode a simple message', () => {
      const type = MessageType.HELLO;
      const payload = new Uint8Array([1, 2, 3, 4]);

      const encoded = encodeMessage(type, payload);
      const decoded = decodeMessage(encoded.buffer as ArrayBuffer);

      expect(decoded.type).toBe(type);
      expect(decoded.payload).toEqual(payload);
    });

    it('should encode and decode correct length', () => {
      const type = MessageType.PING;
      const payload = new Uint8Array(10);
      payload.fill(1);

      const encoded = encodeMessage(type, payload);

      // 1 byte type + 4 bytes length + 10 bytes payload = 15
      expect(encoded.length).toBe(15);

      const decoded = decodeMessage(encoded.buffer as ArrayBuffer);
      expect(decoded.payload).toHaveLength(10);
    });
  });

  describe('JSON Payload Encoding/Decoding', () => {
    it('should encode and decode JSON objects', () => {
      const data = { foo: 'bar', num: 123, bool: true };

      const encoded = encodeJsonPayload(data);
      const decoded = decodeJsonPayload(encoded);

      expect(decoded).toEqual(data);
    });

    it('should handle complex objects', () => {
      const data = {
        nested: { array: [1, 2, 3] },
        nullVal: null,
      };

      const encoded = encodeJsonPayload(data);
      const decoded = decodeJsonPayload(encoded);

      expect(decoded).toEqual(data);
    });
  });

  describe('isValidMessageType', () => {
    it('should validate known types', () => {
      expect(isValidMessageType(MessageType.HELLO)).toBe(true);
      expect(isValidMessageType(MessageType.UPDATE)).toBe(true);
      expect(isValidMessageType(MessageType.DEVICE_REGISTRY)).toBe(true);
    });

    it('should return false for unknown types', () => {
      expect(isValidMessageType(0xff)).toBe(false);
      expect(isValidMessageType(0x00)).toBe(false);
    });
  });

  describe('isDeviceManagementMessage', () => {
    it('should return true for device messages', () => {
      expect(isDeviceManagementMessage(MessageType.DEVICE_REGISTRY)).toBe(true);
      expect(isDeviceManagementMessage(MessageType.DEVICE_UPDATE)).toBe(true);
      expect(isDeviceManagementMessage(MessageType.DEVICE_REVOKE)).toBe(true);
      expect(isDeviceManagementMessage(MessageType.DEVICE_RENAME)).toBe(true);
    });

    it('should return false for core sync messages', () => {
      expect(isDeviceManagementMessage(MessageType.HELLO)).toBe(false);
      expect(isDeviceManagementMessage(MessageType.UPDATE)).toBe(false);
      expect(isDeviceManagementMessage(MessageType.PING)).toBe(false);
    });
  });
});
