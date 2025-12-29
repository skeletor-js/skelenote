import { SyncSettings } from './SyncSettings';
import { SemanticSettings } from './SemanticSettings';
import { ExportSettings } from './ExportSettings';
import './SettingsView.css';

export function SettingsView() {
  return (
    <div className="settings-view">
      <header className="settings-view__header">
        <h1 className="settings-view__title">Settings</h1>
      </header>

      <div className="settings-view__content">
        <SemanticSettings />
        <div className="settings-view__divider" />
        <ExportSettings />
        <div className="settings-view__divider" />
        <SyncSettings />
      </div>
    </div>
  );
}
