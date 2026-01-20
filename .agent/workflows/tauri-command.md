---
description: Generate a new Tauri command with Rust handler and TypeScript bindings
---

# Tauri Command Generation Skill

Generates a complete Tauri command with Rust implementation and TypeScript wrapper.

## Information Needed

1. **Command name** (snake_case, e.g., `get_device_info`)
2. **Parameters** with types
3. **Return type**
4. **Module location** (crypto, network, or lib.rs)
5. **Brief description** of what it does

## Files Modified

### 1. Rust Handler

Location depends on functionality:
- Crypto: `src-tauri/src/crypto/mod.rs`
- Network: `src-tauri/src/network/mod.rs`
- General: `src-tauri/src/lib.rs`

```rust
#[tauri::command]
pub async fn command_name(
    param1: String,
    param2: Option<i32>,
    state: State<'_, AppState>,
) -> Result<ReturnType, String> {
    // Implementation
    Ok(result)
}
```

### 2. Command Registration

In `src-tauri/src/lib.rs`, add to `invoke_handler!` macro:
```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    command_name,
])
```

### 3. TypeScript Wrapper

Create or update file in `src/lib/`:
```typescript
import { invoke } from '@tauri-apps/api/core';

export interface CommandParams {
  param1: string;
  param2?: number;
}

export interface ReturnType {
  // ...
}

export async function commandName(params: CommandParams): Promise<ReturnType> {
  return invoke<ReturnType>('command_name', params);
}
```

## Example: Adding Device Info Command

### User provides:
- Name: `get_device_fingerprint`
- Params: none
- Returns: `{ fingerprint: string, deviceName: string }`
- Module: crypto
- Description: Gets the current device's fingerprint and name

### Generated Rust:

```rust
// In src-tauri/src/crypto/mod.rs

#[tauri::command]
pub async fn get_device_fingerprint(
    state: State<'_, AppState>,
) -> Result<DeviceFingerprintResult, String> {
    let device = state.device.read().await;
    Ok(DeviceFingerprintResult {
        fingerprint: device.fingerprint.clone(),
        device_name: device.name.clone(),
    })
}

#[derive(Serialize)]
pub struct DeviceFingerprintResult {
    fingerprint: String,
    device_name: String,
}
```

### Generated TypeScript:

```typescript
// In src/lib/crypto/device.ts

import { invoke } from '@tauri-apps/api/core';

export interface DeviceFingerprint {
  fingerprint: string;
  deviceName: string;
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprint> {
  return invoke<DeviceFingerprint>('get_device_fingerprint');
}
```

## Steps

1. Ask user for command details
2. Read existing command patterns from the target module
3. Generate Rust function with proper error handling
4. Add serde derives for any new structs
5. Register in invoke_handler macro
6. Generate TypeScript wrapper with types
7. Export from appropriate index file

## Type Mapping

| Rust | TypeScript |
|------|------------|
| String | string |
| i32, i64 | number |
| f32, f64 | number |
| bool | boolean |
| Vec<T> | T[] |
| Option<T> | T \| null |
| HashMap<K, V> | Record<K, V> |

## Error Handling Pattern

Rust commands return `Result<T, String>`:
```rust
.map_err(|e| e.to_string())?
```

TypeScript catches invoke errors:
```typescript
try {
  const result = await invoke('command_name', params);
} catch (error) {
  console.error('Command failed:', error);
}
```

## Notes

- Use async for commands that do I/O or access state
- State access: `State<'_, AppState>` parameter
- Tauri auto-converts snake_case to camelCase for JS
- Add documentation comments for API reference
