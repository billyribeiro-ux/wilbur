/**
 * Test Whiteboard Harness for E2E Testing
 * Provides a deterministic whiteboard environment for Playwright tests
 */

import React, { useEffect, useState } from 'react';
import { WhiteboardCanvasPro } from '../../features/whiteboard/components/WhiteboardCanvasPro';
import { WhiteboardToolbar } from '../../features/whiteboard/components/WhiteboardToolbar';
import { useWhiteboardStore } from '../../features/whiteboard/state/whiteboardStore';
import { TextLayer } from '../../features/whiteboard/components/TextLayer';
import { EmojiPicker } from '../../features/whiteboard/components/EmojiPicker';
import type { TextAnnotation } from '../../features/whiteboard/types';

declare global {
  interface Window {
    __WB_STORE__?: typeof useWhiteboardStore;
    /** Test harness / dev tools may set different breadcrumb shapes */
    __WB_DEBUG_LAST_ADDED__?: unknown;
    __WB_DEBUG_LAST_UPDATED__?: Record<string, unknown> | null;
    __WB_DEBUG_UP__?: boolean;
    __WB_DEBUG_TOOL__?: string;
    __WB_DEBUG_BRANCH__?: unknown;
    __WB_DEBUG_ON_DOWN__?: boolean;
    __WB_DEBUG_ON_MOVE__?: string | null;
    __WB_DEBUG_ON_UP__?: string | null;
  }
}

export const TestWhiteboardHarness: React.FC = () => {
  const {
    shapes,
    tool,
    setTool: _setTool,
    addShape: _addShape,
    updateShape: _updateShape,
    deleteShape: _deleteShape,
    undo: _undo,
    redo: _redo,
    history,
    historyIndex
  } = useWhiteboardStore();

  // State to control emoji picker visibility
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 100, y: 100 });

  // Compute canUndo and canRedo from history state
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Expose store to window for test debugging
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__WB_STORE__ = useWhiteboardStore;
    window.__WB_DEBUG_LAST_ADDED__ = null;
    window.__WB_DEBUG_LAST_UPDATED__ = null;
    window.__WB_DEBUG_UP__ = false;
    window.__WB_DEBUG_TOOL__ = tool;
    window.__WB_DEBUG_BRANCH__ = null;
    window.__WB_DEBUG_ON_DOWN__ = false;
    window.__WB_DEBUG_ON_MOVE__ = null;
    window.__WB_DEBUG_ON_UP__ = null;

    const originalAddShape = useWhiteboardStore.getState().addShape;
    useWhiteboardStore.setState({
      addShape: (shape) => {
        window.__WB_DEBUG_LAST_ADDED__ = shape;
        return originalAddShape(shape);
      }
    });

    const originalUpdateShape = useWhiteboardStore.getState().updateShape;
    useWhiteboardStore.setState({
      updateShape: (id, updates) => {
        window.__WB_DEBUG_LAST_UPDATED__ = {
          id,
          ...updates,
          len: useWhiteboardStore.getState().shapes.size
        };
        return originalUpdateShape(id, updates);
      }
    });

    return () => {
      delete window.__WB_STORE__;
      delete window.__WB_DEBUG_LAST_ADDED__;
      delete window.__WB_DEBUG_LAST_UPDATED__;
      delete window.__WB_DEBUG_UP__;
      delete window.__WB_DEBUG_TOOL__;
      delete window.__WB_DEBUG_BRANCH__;
      delete window.__WB_DEBUG_ON_DOWN__;
      delete window.__WB_DEBUG_ON_MOVE__;
      delete window.__WB_DEBUG_ON_UP__;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time test instrumentation; uses getState() for fresh shape count
  }, []);

  // Update debug tool when it changes and handle emoji tool
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__WB_DEBUG_TOOL__ = tool;

    // Show emoji picker when emoji tool is selected
    if (tool === 'emoji') {
      const centerX = window.innerWidth / 2 - 160;
      const centerY = window.innerHeight / 2 - 200;
      setEmojiPickerPosition({ x: centerX, y: centerY });
      setShowEmojiPicker(true);
    }
  }, [tool]);

  // Track pointer events for debugging
  useEffect(() => {
    const handlePointerDown = () => {
      if (typeof window === 'undefined') return;
      window.__WB_DEBUG_ON_DOWN__ = true;
      window.__WB_DEBUG_UP__ = false;
    };

    const handlePointerMove = () => {
      if (typeof window === 'undefined') return;
      window.__WB_DEBUG_ON_MOVE__ = 'moved';
    };

    const handlePointerUp = () => {
      if (typeof window === 'undefined') return;
      window.__WB_DEBUG_ON_UP__ = 'up';
      window.__WB_DEBUG_UP__ = true;
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-50 overflow-hidden">
      <WhiteboardCanvasPro />

      <TextLayer />

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={(emoji) => {
            console.log('Emoji selected:', emoji);
            const emojiShape: TextAnnotation = {
              id: `emoji-${Date.now()}`,
              type: 'text',
              content: emoji,
              x: emojiPickerPosition.x + 160,
              y: emojiPickerPosition.y + 100,
              color: '#000000',
              opacity: 1,
              fontSize: 48,
              fontFamily: 'Apple Color Emoji, Segoe UI Emoji, sans-serif',
              fontWeight: 400,
              fontStyle: 'normal',
              scale: 1,
              rotation: 0,
              locked: false,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            _addShape(emojiShape);
            setShowEmojiPicker(false);
          }}
          onClose={() => {
            console.log('Emoji picker closed');
            setShowEmojiPicker(false);
          }}
          position={emojiPickerPosition}
        />
      )}

      <div className="absolute top-4 left-4 z-50">
        <WhiteboardToolbar
          onClose={() => {
            console.log('Toolbar closed');
          }}
          canManageRoom={true}
        />
      </div>

      <div
        className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-50"
        data-testid="history-info"
      >
        <div data-testid="history-count">{shapes.size}</div>
        <div className="text-xs text-gray-500">
          {canUndo && <span>Can Undo | </span>}
          {canRedo && <span>Can Redo | </span>}
          Tool: {tool}
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 text-xs z-50">
          <div>Shapes: {shapes.size}</div>
          <div>Tool: {tool}</div>
          <div>Can Undo: {canUndo ? 'Yes' : 'No'}</div>
          <div>Can Redo: {canRedo ? 'Yes' : 'No'}</div>
        </div>
      )}
    </div>
  );
};
