// Lazy import to avoid errors on desktop
let biometricModule: typeof import('@tauri-apps/plugin-biometric') | null =
  null;

export async function getBiometricModule() {
  if (!biometricModule) {
    try {
      biometricModule = await import('@tauri-apps/plugin-biometric');
    } catch {
      return null;
    }
  }
  return biometricModule;
}
