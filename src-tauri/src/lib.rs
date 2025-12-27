/// Greet command - returns a greeting message
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to skelenote.", name)
}

// NOTE: Global Hotkey Quick Capture (Cmd+Shift+Space) - DEPRIORITIZED
//
// A separate floating quick capture window was attempted but deprioritized due to:
// 1. Standard Tauri windows cannot appear over fullscreen macOS apps
// 2. tauri-nspanel (NSPanel solution) crashes with "cannot catch foreign exceptions"
// 3. Transparent windows with rounded corners require macOS private API
//
// The in-app QuickCapture modal (via Cmd+K Command Palette) works and is the
// recommended approach for now.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
