/**
 * Screen share controller — local capture only until media transport is wired to the backend.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { useToastStore } from '../../store/toastStore';

import { MEDIA_CONSTRAINTS } from './constants';
import type { UseScreenShareControllerReturn } from './types';

export function useScreenShareController(): UseScreenShareControllerReturn {
  const [isSharing, setIsSharing] = useState(false);
  const { addToast } = useToastStore();

  const isCleaningUp = useRef(false);
  const screenStream = useRef<MediaStream | null>(null);

  const startScreenShare = useCallback(async () => {
    if (isCleaningUp.current || isSharing) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(MEDIA_CONSTRAINTS.SCREEN_SHARE);

      if (!stream) {
        throw new Error('No screen share stream obtained');
      }

      screenStream.current = stream;

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        void stopScreenShare();
      });

      setIsSharing(true);
      addToast('Screen sharing started (local preview only until media relay is configured)');
    } catch (error) {
      console.error('[ScreenShare] Failed to start screen share:', error);

      if (screenStream.current) {
        screenStream.current.getTracks().forEach((track) => track.stop());
        screenStream.current = null;
      }

      setIsSharing(false);
      addToast('Failed to start screen sharing');
    }
  }, [isSharing, addToast]);

  const stopScreenShare = useCallback(async () => {
    if (isCleaningUp.current) return;

    try {
      if (screenStream.current) {
        screenStream.current.getTracks().forEach((track) => {
          track.stop();
        });
        screenStream.current = null;
      }

      setIsSharing(false);
      addToast('Screen sharing stopped');
    } catch (error) {
      console.error('[ScreenShare] Error stopping screen share:', error);
      if (screenStream.current) {
        screenStream.current.getTracks().forEach((track) => track.stop());
        screenStream.current = null;
      }
      setIsSharing(false);
    }
  }, [addToast]);

  const toggleScreenShare = useCallback(async () => {
    if (isSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isSharing, startScreenShare, stopScreenShare]);

  const cleanup = useCallback(() => {
    isCleaningUp.current = true;

    if (screenStream.current) {
      screenStream.current.getTracks().forEach((track) => track.stop());
      screenStream.current = null;
    }

    setIsSharing(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isSharing,
    toggleScreenShare,
    cleanup,
  };
}
