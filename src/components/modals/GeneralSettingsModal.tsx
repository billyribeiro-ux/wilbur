/**
 * ============================================================================
 * GENERAL SETTINGS MODAL - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Application settings with tabs for app, alert, chat, and presenter settings.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { useState, useEffect, useCallback } from 'react';

import { ModalBase } from './ModalBase';

// ============================================================================
// TYPES
// ============================================================================

interface GeneralSettingsModalProps {
  onClose: () => void;
  isOpen?: boolean;
}

type ColorTheme = 'light' | 'dark';
type RoomLayout = 'left' | 'top' | 'right' | 'bottom';
type TabId = 'app' | 'alert' | 'chat' | 'presenter';

interface SettingsState {
  colorTheme: ColorTheme;
  roomLayout: RoomLayout;
  pmLogsRight: boolean;
  textColor: string;
  usernameColor: string;
  backgroundColor: string;
  tickerColor: string;
  textSize: number;
  dontDisturb: boolean;
  startRecordingSound: boolean;
  stopRecordingSound: boolean;
  recordingPreview: boolean;
  videoEnabled: boolean;
}

interface Tab {
  id: TabId;
  label: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_SETTINGS: SettingsState = {
  colorTheme: 'light',
  roomLayout: 'left',
  pmLogsRight: false,
  textColor: '#000000',
  usernameColor: '#0066cc',
  backgroundColor: '#ffffff',
  tickerColor: '#333333',
  textSize: 13,
  dontDisturb: false,
  startRecordingSound: true,
  stopRecordingSound: true,
  recordingPreview: true,
  videoEnabled: true,
};

const TABS: Tab[] = [
  { id: 'app', label: 'App Settings' },
  { id: 'alert', label: 'Alert Settings' },
  { id: 'chat', label: 'Chat Settings' },
  { id: 'presenter', label: 'Presenter Settings' },
];

const ROOM_LAYOUTS: { value: RoomLayout; label: string }[] = [
  { value: 'left', label: 'Chat and Alerts left' },
  { value: 'top', label: 'Chat and Alerts top' },
  { value: 'right', label: 'Chat and Alerts right' },
  { value: 'bottom', label: 'Chat and Alerts bottom' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${isActive
          ? 'bg-emerald-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }
      `}
    >
      {tab.label}
    </button>
  );
}

interface ColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ id, label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-8 rounded border-2 border-slate-600 cursor-pointer bg-transparent"
        aria-label={label}
      />
      <label htmlFor={id} className="text-slate-300 cursor-pointer">
        {label}
      </label>
    </div>
  );
}

interface CheckboxSettingProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}

function CheckboxSetting({ id, label, checked, onChange, highlight = false }: CheckboxSettingProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`
          w-5 h-5 rounded cursor-pointer
          ${highlight ? 'accent-emerald-600' : 'accent-slate-400'}
        `}
      />
      <span className={highlight ? 'text-white font-medium' : 'text-slate-300'}>
        {label}
      </span>
    </label>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GeneralSettingsModal({ onClose, isOpen = true }: GeneralSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('app');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('general_settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('[GeneralSettingsModal] Failed to load settings:', error);
    }
  }, []);

  // Handlers
  const updateSetting = useCallback(<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem('general_settings', JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }));
      onClose();
    } catch (error) {
      console.error('[GeneralSettingsModal] Failed to save settings:', error);
    }
  }, [settings, onClose]);

  const handleReset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabIndex: number) => {
    const tabCount = TABS.length;
    let newIndex = tabIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = tabIndex === 0 ? tabCount - 1 : tabIndex - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = tabIndex === tabCount - 1 ? 0 : tabIndex + 1;
        break;
      default:
        return;
    }

    setActiveTab(TABS[newIndex].id);
    document.getElementById(`tab-${TABS[newIndex].id}`)?.focus();
  }, []);

  // Footer
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={handleReset}
        className="
          px-6 py-2 border-2 border-red-600 text-red-500
          hover:bg-red-600 hover:text-white
          font-semibold rounded-lg transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
        "
      >
        Reset
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="
          px-6 py-2 bg-emerald-600 hover:bg-emerald-700
          text-white font-semibold rounded-lg transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
        "
      >
        Save changes
      </button>
    </div>
  );

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="General Settings"
      size="lg"
      footer={footer}
      testId="general-settings-modal"
    >
      {/* Tabs */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-700/50 bg-slate-900/50">
        <div
          role="tablist"
          aria-label="Settings categories"
          className="flex flex-wrap gap-1 sm:gap-2"
        >
          {TABS.map((tab, index) => (
            <div
              key={tab.id}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <TabButton
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* App Settings Panel */}
        <div
          id="panel-app"
          role="tabpanel"
          aria-labelledby="tab-app"
          hidden={activeTab !== 'app'}
        >
          {activeTab === 'app' && (
            <div className="space-y-6">
              {/* Color Theme */}
              <fieldset>
                <legend className="text-white font-semibold mb-3">
                  Choose Color Theme
                </legend>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="colorTheme"
                      checked={settings.colorTheme === 'light'}
                      onChange={() => updateSetting('colorTheme', 'light')}
                      className="w-5 h-5 accent-emerald-600"
                    />
                    <span className={settings.colorTheme === 'light' ? 'text-white font-medium' : 'text-slate-300'}>
                      Light Theme
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="colorTheme"
                      checked={settings.colorTheme === 'dark'}
                      onChange={() => updateSetting('colorTheme', 'dark')}
                      className="w-5 h-5 accent-slate-400"
                    />
                    <span className={settings.colorTheme === 'dark' ? 'text-white font-medium' : 'text-slate-300'}>
                      Dark Theme
                    </span>
                  </label>
                </div>
              </fieldset>

              {/* Room Layout */}
              <fieldset>
                <legend className="text-white font-semibold mb-3">
                  Room Layout
                </legend>
                <div className="space-y-2">
                  {ROOM_LAYOUTS.map((layout) => (
                    <label
                      key={layout.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="roomLayout"
                        checked={settings.roomLayout === layout.value}
                        onChange={() => updateSetting('roomLayout', layout.value)}
                        className={`w-5 h-5 ${settings.roomLayout === layout.value ? 'accent-emerald-600' : 'accent-slate-400'}`}
                      />
                      <span className={settings.roomLayout === layout.value ? 'text-white font-medium' : 'text-slate-300'}>
                        {layout.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* PM Logs */}
              <CheckboxSetting
                id="pm-logs"
                label="PM logs on the right"
                checked={settings.pmLogsRight}
                onChange={(v) => updateSetting('pmLogsRight', v)}
              />

              {/* Colors & Size */}
              <fieldset>
                <legend className="text-white font-semibold mb-3">
                  Colors & Size
                </legend>
                <div className="space-y-3">
                  <ColorInput
                    id="text-color"
                    label="Text Color"
                    value={settings.textColor}
                    onChange={(v) => updateSetting('textColor', v)}
                  />
                  <ColorInput
                    id="username-color"
                    label="Username Color"
                    value={settings.usernameColor}
                    onChange={(v) => updateSetting('usernameColor', v)}
                  />
                  <ColorInput
                    id="background-color"
                    label="Background Color"
                    value={settings.backgroundColor}
                    onChange={(v) => updateSetting('backgroundColor', v)}
                  />
                  <ColorInput
                    id="ticker-color"
                    label="Ticker Color"
                    value={settings.tickerColor}
                    onChange={(v) => updateSetting('tickerColor', v)}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      id="text-size"
                      type="number"
                      value={settings.textSize}
                      onChange={(e) => updateSetting('textSize', parseInt(e.target.value, 10) || 13)}
                      min="8"
                      max="24"
                      className="
                        w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded
                        text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                      "
                      aria-label="Text size"
                    />
                    <label htmlFor="text-size" className="text-slate-300 cursor-pointer">
                      Text Size
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* Do Not Disturb */}
              <fieldset>
                <legend className="text-white font-semibold mb-3">
                  Notifications
                </legend>
                <div className="space-y-2">
                  <CheckboxSetting
                    id="dont-disturb"
                    label="Do Not Disturb"
                    checked={settings.dontDisturb}
                    onChange={(v) => updateSetting('dontDisturb', v)}
                  />
                  <CheckboxSetting
                    id="start-recording-sound"
                    label="Start Recording Sound"
                    checked={settings.startRecordingSound}
                    onChange={(v) => updateSetting('startRecordingSound', v)}
                    highlight={settings.startRecordingSound}
                  />
                  <CheckboxSetting
                    id="stop-recording-sound"
                    label="Stop Recording Sound"
                    checked={settings.stopRecordingSound}
                    onChange={(v) => updateSetting('stopRecordingSound', v)}
                    highlight={settings.stopRecordingSound}
                  />
                  <CheckboxSetting
                    id="recording-preview"
                    label="Recording Preview"
                    checked={settings.recordingPreview}
                    onChange={(v) => updateSetting('recordingPreview', v)}
                    highlight={settings.recordingPreview}
                  />
                </div>
              </fieldset>

              {/* Video */}
              <fieldset>
                <legend className="text-white font-semibold mb-3">
                  Video
                </legend>
                <CheckboxSetting
                  id="video-enabled"
                  label="Video Enabled"
                  checked={settings.videoEnabled}
                  onChange={(v) => updateSetting('videoEnabled', v)}
                  highlight={settings.videoEnabled}
                />
              </fieldset>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  type="button"
                  onClick={() => console.log('Remove webcam/screen preview windows')}
                  className="
                    w-full bg-red-600 hover:bg-red-700 text-white
                    font-semibold py-3 px-4 rounded-lg transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
                  "
                >
                  Remove webcam/screen preview windows
                </button>
                <button
                  type="button"
                  onClick={() => console.log('Edit my Info and Avatar')}
                  className="
                    w-full bg-amber-600 hover:bg-amber-700 text-white
                    font-semibold py-3 px-4 rounded-lg transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                  "
                >
                  Edit my Info and Avatar
                </button>
                <button
                  type="button"
                  onClick={() => console.log('Get my token')}
                  className="
                    w-full bg-amber-600 hover:bg-amber-700 text-white
                    font-semibold py-3 px-4 rounded-lg transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500
                  "
                >
                  Get my token
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alert Settings Panel */}
        <div
          id="panel-alert"
          role="tabpanel"
          aria-labelledby="tab-alert"
          hidden={activeTab !== 'alert'}
        >
          {activeTab === 'alert' && (
            <div className="text-slate-400 text-center py-8">
              <p>Alert settings coming soon...</p>
            </div>
          )}
        </div>

        {/* Chat Settings Panel */}
        <div
          id="panel-chat"
          role="tabpanel"
          aria-labelledby="tab-chat"
          hidden={activeTab !== 'chat'}
        >
          {activeTab === 'chat' && (
            <div className="text-slate-400 text-center py-8">
              <p>Chat settings coming soon...</p>
            </div>
          )}
        </div>

        {/* Presenter Settings Panel */}
        <div
          id="panel-presenter"
          role="tabpanel"
          aria-labelledby="tab-presenter"
          hidden={activeTab !== 'presenter'}
        >
          {activeTab === 'presenter' && (
            <div className="text-slate-400 text-center py-8">
              <p>Presenter settings coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </ModalBase>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GeneralSettingsModal;
