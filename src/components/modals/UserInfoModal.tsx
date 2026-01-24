/**
 * ============================================================================
 * USER INFO MODAL - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * User profile modal with tabs for info, system, actions, and notes.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { useState, useCallback } from 'react';
import {
  Mic,
  Monitor,
  Video,
  MessageSquare,
  Wrench,
  Pencil,
  AtSign,
  MessageCircle,
  UserPlus,
} from 'lucide-react';

import { ModalBase } from './ModalBase';

// ============================================================================
// TYPES
// ============================================================================

interface UserInfoModalProps {
  user: {
    id: string;
    display_name?: string;
    username?: string;
    email?: string;
    avatar_url?: string;
    last_login?: string;
    location?: string;
    system?: string;
  };
  onClose: () => void;
  isOpen?: boolean;
}

type TabId = 'info' | 'system' | 'actions' | 'notes';

interface Tab {
  id: TabId;
  label: string;
}

interface Permissions {
  microphone: boolean;
  screenshare: boolean;
  webcam: boolean;
  adminChat: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  { id: 'info', label: 'User Info' },
  { id: 'system', label: 'System' },
  { id: 'actions', label: 'Actions' },
  { id: 'notes', label: 'Admin Notes' },
];

const INITIAL_PERMISSIONS: Permissions = {
  microphone: false,
  screenshare: false,
  webcam: false,
  adminChat: false,
};

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
        px-4 sm:px-6 py-3 font-medium rounded-t-lg transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
        ${isActive
          ? 'bg-slate-800 text-emerald-400 border-b-2 border-emerald-400'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }
      `}
    >
      {tab.label}
    </button>
  );
}

interface PermissionCheckboxProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PermissionCheckbox({ id, label, icon, checked, onChange }: PermissionCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer group"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="
          w-5 h-5 rounded border-slate-600 bg-slate-700
          text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800
          cursor-pointer
        "
      />
      <span className="text-slate-400 group-hover:text-slate-300 transition-colors">
        {icon}
      </span>
      <span className="text-white group-hover:text-white transition-colors">
        {label}
      </span>
    </label>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserInfoModal({ user, onClose, isOpen = true }: UserInfoModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [permissions, setPermissions] = useState<Permissions>(INITIAL_PERMISSIONS);
  const [temporaryAccess, setTemporaryAccess] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const displayName = user.display_name || user.username || 'Unknown User';
  const initials = displayName.charAt(0).toUpperCase();

  // Handlers
  const handlePermissionChange = useCallback((key: keyof Permissions, value: boolean) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSavePermissions = useCallback(() => {
    // TODO: Implement save to backend
    console.log('Saving permissions:', permissions, 'Temporary:', temporaryAccess);
  }, [permissions, temporaryAccess]);

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
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabCount - 1;
        break;
      default:
        return;
    }

    setActiveTab(TABS[newIndex].id);
    // Focus the new tab
    document.getElementById(`tab-${TABS[newIndex].id}`)?.focus();
  }, []);

  // Footer actions
  const footer = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => console.log('Mention user:', user.id)}
        className="
          px-4 py-2 bg-transparent border-2 border-slate-500 text-slate-300
          font-medium rounded-lg transition-all duration-200
          hover:border-white hover:text-white hover:bg-white/5
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          flex items-center gap-2
        "
        aria-label={`Mention ${displayName}`}
      >
        <AtSign className="w-4 h-4" />
        <span className="hidden sm:inline">Mention</span>
      </button>
      <button
        type="button"
        onClick={() => console.log('Private chat with:', user.id)}
        className="
          px-4 py-2 bg-transparent border-2 border-slate-500 text-slate-300
          font-medium rounded-lg transition-all duration-200
          hover:border-white hover:text-white hover:bg-white/5
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          flex items-center gap-2
        "
        aria-label={`Private chat with ${displayName}`}
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Private Chat</span>
      </button>
      <button
        type="button"
        onClick={() => console.log('Follow user:', user.id)}
        className="
          px-4 py-2 bg-transparent border-2 border-cyan-500 text-cyan-400
          font-medium rounded-lg transition-all duration-200
          hover:bg-cyan-500/10
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          flex items-center gap-2
        "
        aria-label={`Follow ${displayName}`}
      >
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Follow</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        className="
          ml-auto px-6 py-2 bg-blue-600 text-white
          font-medium rounded-lg transition-all duration-200
          hover:bg-blue-700
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        "
      >
        Close
      </button>
    </div>
  );

  // Custom header with avatar
  const customHeader = (
    <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700/50">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-700 flex items-center justify-center overflow-hidden">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={`${displayName}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl sm:text-4xl text-white">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => console.log('Edit avatar')}
            className="
              absolute -bottom-1 -right-1 p-2 bg-slate-600 rounded-full
              hover:bg-slate-500 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            "
            aria-label="Edit avatar"
          >
            <Pencil className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Name and edit */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {displayName}
            </h2>
            <button
              type="button"
              onClick={() => console.log('Edit name')}
              className="
                p-1 text-blue-400 hover:text-blue-300 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
              "
              aria-label="Edit display name"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      footer={footer}
      customHeader={customHeader}
      testId="user-info-modal"
    >
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="User information tabs"
        className="flex gap-1 px-4 sm:px-6 pt-4 border-b border-slate-700/50 bg-slate-900/50"
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

      {/* Tab Panels */}
      <div className="p-4 sm:p-6">
        {/* Info Panel */}
        <div
          id="panel-info"
          role="tabpanel"
          aria-labelledby="tab-info"
          hidden={activeTab !== 'info'}
          tabIndex={0}
        >
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* User Info Fields */}
              <div className="space-y-4">
                <InfoRow label="Name" value={displayName} />
                <InfoRow label="Last Login" value={user.last_login || 'N/A'} />
                <InfoRow
                  label="Email"
                  value={user.email || 'N/A'}
                  isLink={!!user.email}
                />
                <InfoRow label="Badges" value="" />
                <InfoRow label="Location" value={user.location || 'N/A'} />
                <InfoRow label="System" value={user.system || 'N/A'} />
              </div>

              {/* Permissions Section */}
              <div className="pt-4 border-t border-slate-700/50">
                <h3 className="font-semibold text-white mb-4">Permissions</h3>
                <div className="space-y-3">
                  <PermissionCheckbox
                    id="perm-mic"
                    label="Microphone"
                    icon={<Mic className="w-5 h-5" />}
                    checked={permissions.microphone}
                    onChange={(v) => handlePermissionChange('microphone', v)}
                  />
                  <PermissionCheckbox
                    id="perm-screen"
                    label="Screenshare"
                    icon={<Monitor className="w-5 h-5" />}
                    checked={permissions.screenshare}
                    onChange={(v) => handlePermissionChange('screenshare', v)}
                  />
                  <PermissionCheckbox
                    id="perm-webcam"
                    label="WebCam"
                    icon={<Video className="w-5 h-5" />}
                    checked={permissions.webcam}
                    onChange={(v) => handlePermissionChange('webcam', v)}
                  />
                  <PermissionCheckbox
                    id="perm-admin-chat"
                    label="Admin Chat"
                    icon={<MessageSquare className="w-5 h-5" />}
                    checked={permissions.adminChat}
                    onChange={(v) => handlePermissionChange('adminChat', v)}
                  />
                </div>

                {/* Save and Temporary Access */}
                <div className="flex items-center justify-between mt-6 flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    className="
                      px-6 py-2 bg-emerald-600 hover:bg-emerald-700
                      text-white font-semibold rounded-lg
                      border-2 border-emerald-500 transition-all duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                    "
                  >
                    Save
                  </button>
                  <label
                    htmlFor="temp-access"
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      id="temp-access"
                      checked={temporaryAccess}
                      onChange={(e) => setTemporaryAccess(e.target.checked)}
                      className="
                        w-5 h-5 rounded border-slate-600 bg-slate-700
                        text-slate-500 focus:ring-slate-500 focus:ring-offset-slate-800
                        cursor-pointer
                      "
                    />
                    <Wrench className="w-5 h-5 text-slate-400" />
                    <span className="text-white">Temporary Access Only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Panel */}
        <div
          id="panel-system"
          role="tabpanel"
          aria-labelledby="tab-system"
          hidden={activeTab !== 'system'}
          tabIndex={0}
        >
          {activeTab === 'system' && (
            <div className="text-slate-400 text-center py-8">
              <p>System information coming soon...</p>
            </div>
          )}
        </div>

        {/* Actions Panel */}
        <div
          id="panel-actions"
          role="tabpanel"
          aria-labelledby="tab-actions"
          hidden={activeTab !== 'actions'}
          tabIndex={0}
        >
          {activeTab === 'actions' && (
            <div className="text-slate-400 text-center py-8">
              <p>Actions coming soon...</p>
            </div>
          )}
        </div>

        {/* Notes Panel */}
        <div
          id="panel-notes"
          role="tabpanel"
          aria-labelledby="tab-notes"
          hidden={activeTab !== 'notes'}
          tabIndex={0}
        >
          {activeTab === 'notes' && (
            <div>
              <label htmlFor="admin-notes" className="sr-only">
                Admin notes for {displayName}
              </label>
              <textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="
                  w-full h-64 bg-slate-800 text-white p-4 rounded-lg
                  border border-slate-700 resize-none
                  placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                "
                placeholder="Enter admin notes..."
              />
            </div>
          )}
        </div>
      </div>
    </ModalBase>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface InfoRowProps {
  label: string;
  value: string;
  isLink?: boolean;
}

function InfoRow({ label, value, isLink = false }: InfoRowProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-semibold text-slate-400 w-28 sm:w-32 flex-shrink-0">
        {label}:
      </span>
      {isLink && value ? (
        <a
          href={`mailto:${value}`}
          className="text-blue-400 hover:text-blue-300 underline transition-colors"
        >
          {value}
        </a>
      ) : (
        <span className="text-white truncate">{value || 'N/A'}</span>
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UserInfoModal;
