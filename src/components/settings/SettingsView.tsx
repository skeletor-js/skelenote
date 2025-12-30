import { SyncSettings } from './SyncSettings';
import { SemanticSettings } from './SemanticSettings';
import { ExportSettings } from './ExportSettings';
import { TemplateSettings } from './TemplateSettings';
import './SettingsView.css';

export function SettingsView() {
  return (
    <div className="settings-view">
      <header className="settings-view__header">
        <h1 className="settings-view__title">Settings</h1>
      </header>

      <div className="settings-view__content">
        <TemplateSettings />
        <div className="settings-view__divider" />
        <SemanticSettings />
        <div className="settings-view__divider" />
        <ExportSettings />
        <div className="settings-view__divider" />
        <SyncSettings />
      </div>
    </div>
  );
}
