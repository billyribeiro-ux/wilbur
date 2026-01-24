/**
 * ============================================================================
 * USERS PANEL MODAL - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Room member list with search, sort, and user actions.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { X, Search, ArrowUpDown, RefreshCw, Settings, User, AtSign, MessageSquare } from 'lucide-react';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

import { useRoomStore } from '../../store/roomStore';
import { ModalBase } from './ModalBase';

// ============================================================================
// TYPES
// ============================================================================

interface UsersPanelModalProps {
  onClose: () => void;
  isOpen?: boolean;
}

type SortOrder = 'asc' | 'desc' | 'none';

// ============================================================================
// COMPONENT
// ============================================================================

export function UsersPanelModal({ onClose, isOpen = true }: UsersPanelModalProps) {
  const { members } = useRoomStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...members];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.display_name?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query) ||
        user.region?.toLowerCase().includes(query) ||
        user.country?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortOrder !== 'none') {
      result.sort((a, b) => {
        const nameA = a.display_name?.toLowerCase() || '';
        const nameB = b.display_name?.toLowerCase() || '';
        return sortOrder === 'asc'
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      });
    }

    return result;
  }, [members, searchQuery, sortOrder]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSelectedUserId(undefined);
      }
    };

    if (selectedUserId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedUserId]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleSort = useCallback(() => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  }, []);

  const handleUserMenu = useCallback((userId: string) => {
    setSelectedUserId(prev => prev === userId ? undefined : userId);
  }, []);

  const handleSettings = useCallback(() => {
    console.log('User panel settings clicked');
  }, []);

  const handleMenuAction = useCallback((action: string, userId: string) => {
    console.log(`${action}:`, userId);
    setSelectedUserId(undefined);
  }, []);

  // Custom header
  const customHeader = (
    <div className="bg-slate-800 px-4 sm:px-6 py-4 border-b border-slate-700">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Room Members</h2>
            <p className="text-sm text-slate-400">{members.length} users online</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="
            p-2 hover:bg-slate-700 rounded-lg transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
          aria-label="Close panel"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => searchInputRef.current?.focus()}
          className="
            flex-1 p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors
            flex items-center justify-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
          aria-label="Search users"
        >
          <Search className="w-5 h-5 text-slate-300" />
        </button>

        <button
          type="button"
          onClick={handleSort}
          className={`
            flex-1 p-2.5 rounded-lg transition-colors flex items-center justify-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${sortOrder !== 'none'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }
          `}
          aria-label={`Sort ${sortOrder === 'asc' ? 'Z-A' : sortOrder === 'desc' ? 'None' : 'A-Z'}`}
          aria-pressed={sortOrder !== 'none'}
        >
          <ArrowUpDown className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="
            flex-1 p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400
            disabled:cursor-not-allowed rounded-lg transition-colors
            flex items-center justify-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
          "
          aria-label="Refresh users"
        >
          <RefreshCw className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleSettings}
          className="
            flex-1 p-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors
            flex items-center justify-center
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          "
          aria-label="Panel settings"
        >
          <Settings className="w-5 h-5 text-slate-300" />
        </button>
      </div>
    </div>
  );

  // Footer
  const footer = (
    <div className="flex items-center justify-between text-sm text-slate-400">
      <span>
        Showing {filteredAndSortedUsers.length} of {members.length} users
      </span>
      {sortOrder !== 'none' && (
        <span className="text-blue-400 font-medium">
          Sorted {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </span>
      )}
    </div>
  );

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      customHeader={customHeader}
      footer={footer}
      testId="users-panel-modal"
    >
      {/* Search Input */}
      <div className="px-4 sm:px-6 py-3 bg-slate-900/50 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <input
            ref={searchInputRef}
            id="user-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="
              w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-lg
              text-white placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="
                absolute right-3 top-1/2 transform -translate-y-1/2
                text-slate-500 hover:text-slate-300 transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded
              "
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="max-h-[50vh] overflow-y-auto">
        {filteredAndSortedUsers.length === 0 ? (
          <div className="flex items-center justify-center py-12 px-4">
            <p className="text-slate-500 text-center">
              {searchQuery ? 'No users found matching your search.' : 'No users in this room.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-700/50" role="list" aria-label="Room members">
            {filteredAndSortedUsers.map((user) => (
              <li
                key={user.id}
                className="relative flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-slate-800/50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                      <span className="text-slate-300 font-semibold text-lg">
                        {user.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base truncate">
                    {user.display_name || 'Unknown User'}
                  </h3>
                  {(user.city || user.region || user.country) && (
                    <p className="text-slate-400 text-sm truncate">
                      {[user.city, user.region, user.country_code || user.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>

                {/* Menu Button */}
                <button
                  type="button"
                  onClick={() => handleUserMenu(user.id)}
                  className="
                    p-2 hover:bg-slate-700 rounded-lg transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  "
                  aria-label={`Options for ${user.display_name || 'user'}`}
                  aria-haspopup="true"
                  aria-expanded={selectedUserId === user.id}
                >
                  <span className="text-xl text-slate-400">⋮</span>
                </button>

                {/* User Menu Dropdown */}
                {selectedUserId === user.id && (
                  <div
                    ref={menuRef}
                    className="
                      absolute right-4 top-full mt-1 z-20
                      bg-slate-800 border border-slate-700 rounded-xl shadow-2xl
                      min-w-[200px] overflow-hidden
                    "
                    role="menu"
                    aria-label="User actions"
                  >
                    <button
                      type="button"
                      onClick={() => handleMenuAction('View user info', user.id)}
                      className="
                        w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors
                        flex items-center gap-3 border-b border-slate-700
                        focus:outline-none focus-visible:bg-slate-700
                      "
                      role="menuitem"
                    >
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="text-white">View Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMenuAction('Mention', user.id)}
                      className="
                        w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors
                        flex items-center gap-3 border-b border-slate-700
                        focus:outline-none focus-visible:bg-slate-700
                      "
                      role="menuitem"
                    >
                      <AtSign className="w-5 h-5 text-slate-400" />
                      <span className="text-white">Mention</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMenuAction('Private chat', user.id)}
                      className="
                        w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors
                        flex items-center gap-3
                        focus:outline-none focus-visible:bg-slate-700
                      "
                      role="menuitem"
                    >
                      <MessageSquare className="w-5 h-5 text-slate-400" />
                      <span className="text-white">Private Chat</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ModalBase>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UsersPanelModal;
