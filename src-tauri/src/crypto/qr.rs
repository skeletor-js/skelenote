//! QR code generation for Skeleton Key transfer
//!
//! Generates QR codes that can be scanned to transfer the Skeleton Key
//! between devices without manual entry.

use base64::{engine::general_purpose::STANDARD, Engine};
use qrcode::{render::svg, EcLevel, QrCode};

use super::error::QrError;

/// Protocol prefix for Skelenote QR codes
const QR_PREFIX: &str = "skelenote:v1:";

/// Generate QR code as base64-encoded SVG for mnemonic display
///
/// Returns a data URI that can be used directly in an <img> src attribute.
pub fn generate_mnemonic_qr(mnemonic: &str) -> Result<String, QrError> {
    // Create QR payload with protocol prefix
    let payload = create_qr_payload(mnemonic);

    // Create QR code with high error correction (mnemonic is critical data)
    let code = QrCode::with_error_correction_level(&payload, EcLevel::H)
        .map_err(|e| QrError::GenerationFailed(e.to_string()))?;

    // Render as SVG (scales cleanly at any size)
    let svg = code
        .render()
        .min_dimensions(200, 200)
        .dark_color(svg::Color("#000000"))
        .light_color(svg::Color("#ffffff"))
        .quiet_zone(true)
        .build();

    // Return as base64 data URI
    let encoded = STANDARD.encode(svg.as_bytes());
    Ok(format!("data:image/svg+xml;base64,{}", encoded))
}

/// Create QR payload with protocol prefix
///
/// Format: "skelenote:v1:<mnemonic>"
pub fn create_qr_payload(mnemonic: &str) -> String {
    format!("{}{}", QR_PREFIX, mnemonic)
}

/// Parse QR payload and extract mnemonic
///
/// Returns the mnemonic if the payload has the correct format.
pub fn parse_qr_payload(payload: &str) -> Result<String, QrError> {
    payload
        .strip_prefix(QR_PREFIX)
        .map(|s| s.to_string())
        .ok_or(QrError::InvalidFormat)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qr_payload_roundtrip() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let payload = create_qr_payload(mnemonic);
        let parsed = parse_qr_payload(&payload).unwrap();
        assert_eq!(parsed, mnemonic);
    }

    #[test]
    fn test_invalid_payload() {
        let result = parse_qr_payload("invalid:payload");
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_qr() {
        let mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        let qr = generate_mnemonic_qr(mnemonic).unwrap();
        assert!(qr.starts_with("data:image/svg+xml;base64,"));
    }
}
