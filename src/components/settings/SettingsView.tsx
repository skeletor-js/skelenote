import { SyncSettings } from './SyncSettings';
import './SettingsView.css';

export function SettingsView() {
  return (
    <div className="settings-view">
      <header className="settings-view__header">
        <h1 className="settings-view__title">Settings</h1>
      </header>

      <div className="settings-view__content">
        <SyncSettings />
      </div>
    </div>
  );
}
