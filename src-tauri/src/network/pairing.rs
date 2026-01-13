//! QR Code Pairing
//!
//! Generates and parses QR codes for explicit device pairing.
//! Replaces mDNS auto-discovery with QR scan workflow.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use qrcode::{QrCode, EcLevel};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// QR payload version
pub const PAIRING_VERSION: u32 = 1;

/// URL scheme for pairing
pub const PAIRING_SCHEME: &str = "skelenote://pair";

/// Errors that can occur during pairing operations
#[derive(Error, Debug)]
pub enum PairingError {
    #[error("QR generation error: {0}")]
    QrGeneration(String),
    #[error("Invalid QR payload: {0}")]
    InvalidPayload(String),
    #[error("Base64 decode error: {0}")]
    Base64Decode(#[from] base64::DecodeError),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Network error: {0}")]
    Network(String),
}

/// QR code payload (encoded in URL)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingPayload {
    /// Protocol version
    pub v: u32,
    /// Local IP addresses
    pub ips: Vec<String>,
    /// TCP server port
    pub port: u16,
    /// Key fingerprint (8-char hex)
    pub fp: String,
    /// Device UUID
    pub id: String,
    /// Device name
    pub name: String,
}

impl PairingPayload {
    /// Create a new pairing payload
    pub fn new(
        ips: Vec<String>,
        port: u16,
        fingerprint: String,
        device_id: String,
        device_name: String,
    ) -> Self {
        Self {
            v: PAIRING_VERSION,
            ips,
            port,
            fp: fingerprint,
            id: device_id,
            name: device_name,
        }
    }

    /// Encode payload to URL string
    pub fn to_url(&self) -> Result<String, PairingError> {
        let json = serde_json::to_string(self)?;
        let base64 = URL_SAFE_NO_PAD.encode(json.as_bytes());
        Ok(format!("{}?v={}&d={}", PAIRING_SCHEME, PAIRING_VERSION, base64))
    }

    /// Parse payload from URL string
    pub fn from_url(url: &str) -> Result<Self, PairingError> {
        // Check scheme
        if !url.starts_with(PAIRING_SCHEME) {
            return Err(PairingError::InvalidPayload(format!(
                "Invalid scheme, expected {}",
                PAIRING_SCHEME
            )));
        }

        // Parse query parameters
        let query_start = url.find('?')
            .ok_or_else(|| PairingError::InvalidPayload("Missing query parameters".to_string()))?;
        let query = &url[query_start + 1..];

        // Extract 'd' parameter (base64 data)
        let data_param = query
            .split('&')
            .find(|param| param.starts_with("d="))
            .ok_or_else(|| PairingError::InvalidPayload("Missing 'd' parameter".to_string()))?;

        let base64_data = &data_param[2..]; // Skip "d="

        // Decode base64
        let json_bytes = URL_SAFE_NO_PAD.decode(base64_data)?;
        let json_str = String::from_utf8(json_bytes)
            .map_err(|e| PairingError::InvalidPayload(format!("Invalid UTF-8: {}", e)))?;

        // Parse JSON
        let payload: PairingPayload = serde_json::from_str(&json_str)?;

        // Validate version
        if payload.v != PAIRING_VERSION {
            return Err(PairingError::InvalidPayload(format!(
                "Unsupported version: {}",
                payload.v
            )));
        }

        Ok(payload)
    }

    /// Generate QR code as PNG bytes
    pub fn to_qr_png(&self) -> Result<Vec<u8>, PairingError> {
        let url = self.to_url()?;

        // Generate QR code with error correction level M (15% recovery)
        let code = QrCode::with_error_correction_level(&url, EcLevel::M)
            .map_err(|e| PairingError::QrGeneration(e.to_string()))?;

        // Convert to image (scale for readability)
        let img_buffer = code.render::<image::Luma<u8>>()
            .min_dimensions(200, 200) // Minimum 200x200 pixels
            .build();

        // Convert ImageBuffer to DynamicImage
        let dynamic_image = image::DynamicImage::ImageLuma8(img_buffer);

        // Encode as PNG
        let mut png_bytes = Vec::new();
        dynamic_image.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .map_err(|e| PairingError::QrGeneration(format!("PNG encoding failed: {}", e)))?;

        Ok(png_bytes)
    }
}

/// Get all local IPv4 addresses
pub fn get_local_ips() -> Result<Vec<String>, PairingError> {
    // Use local-ip-address crate to get all interfaces
    let interfaces = local_ip_address::list_afinet_netifas()
        .map_err(|e| PairingError::Network(format!("Failed to list network interfaces: {}", e)))?;

    let mut ips = Vec::new();

    for (_, ip) in interfaces {
        // Only include IPv4 addresses in private ranges
        if let std::net::IpAddr::V4(ipv4) = ip {
            let octets = ipv4.octets();

            // Check for private IP ranges:
            // 192.168.x.x, 10.x.x.x, 172.16-31.x.x
            let is_private =
                octets[0] == 192 && octets[1] == 168 || // 192.168.x.x
                octets[0] == 10 ||                       // 10.x.x.x
                (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31); // 172.16-31.x.x

            if is_private {
                ips.push(ipv4.to_string());
            }
        }
    }

    // Remove duplicates and sort for consistency
    ips.sort();
    ips.dedup();

    if ips.is_empty() {
        return Err(PairingError::Network("No local IP addresses found".to_string()));
    }

    Ok(ips)
}

/// Information extracted from a scanned QR code (for frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PairingInfo {
    /// Device UUID
    pub device_id: String,
    /// Device name
    pub device_name: String,
    /// IP addresses to try
    pub ips: Vec<String>,
    /// TCP port
    pub port: u16,
    /// Key fingerprint
    pub fingerprint: String,
    /// Whether fingerprint matches ours
    pub fingerprint_match: bool,
}

impl PairingInfo {
    /// Create from payload and check fingerprint
    pub fn from_payload(payload: PairingPayload, our_fingerprint: &str) -> Self {
        let fingerprint_match = payload.fp == our_fingerprint;
        Self {
            device_id: payload.id,
            device_name: payload.name,
            ips: payload.ips,
            port: payload.port,
            fingerprint: payload.fp,
            fingerprint_match,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payload_to_url() {
        let payload = PairingPayload::new(
            vec!["192.168.1.50".to_string(), "10.0.0.15".to_string()],
            54321,
            "a1b2c3d4".to_string(),
            "550e8400-e29b-41d4-a716-446655440000".to_string(),
            "MacBook Pro".to_string(),
        );

        let url = payload.to_url().unwrap();
        assert!(url.starts_with("skelenote://pair?v=1&d="));
    }

    #[test]
    fn test_payload_roundtrip() {
        let payload = PairingPayload::new(
            vec!["192.168.1.50".to_string()],
            54321,
            "a1b2c3d4".to_string(),
            "test-device".to_string(),
            "Test Device".to_string(),
        );

        let url = payload.to_url().unwrap();
        let decoded = PairingPayload::from_url(&url).unwrap();

        assert_eq!(decoded.v, payload.v);
        assert_eq!(decoded.ips, payload.ips);
        assert_eq!(decoded.port, payload.port);
        assert_eq!(decoded.fp, payload.fp);
        assert_eq!(decoded.id, payload.id);
        assert_eq!(decoded.name, payload.name);
    }

    #[test]
    fn test_qr_generation() {
        let payload = PairingPayload::new(
            vec!["192.168.1.50".to_string()],
            54321,
            "a1b2c3d4".to_string(),
            "test-device".to_string(),
            "Test Device".to_string(),
        );

        let png_bytes = payload.to_qr_png().unwrap();

        // Check PNG header
        assert!(png_bytes.len() > 8);
        assert_eq!(&png_bytes[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
    }

    #[test]
    fn test_invalid_scheme() {
        let result = PairingPayload::from_url("https://example.com?v=1&d=abc");
        assert!(matches!(result, Err(PairingError::InvalidPayload(_))));
    }

    #[test]
    fn test_missing_data_param() {
        let result = PairingPayload::from_url("skelenote://pair?v=1");
        assert!(matches!(result, Err(PairingError::InvalidPayload(_))));
    }

    #[test]
    fn test_get_local_ips() {
        // This test may fail in some environments (e.g., no network interfaces)
        // but should at least not panic
        let result = get_local_ips();
        match result {
            Ok(ips) => {
                println!("Found local IPs: {:?}", ips);
                assert!(!ips.is_empty());
            }
            Err(e) => {
                println!("Failed to get local IPs (may be expected in test environment): {}", e);
            }
        }
    }
}
