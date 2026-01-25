/**
 * ============================================================================
 * IMAGE MODAL COMPONENT - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Full-screen image viewer with download functionality.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';

import { downloadImage } from '../../utils/imageModal';

// ============================================================================
// TYPES
// ============================================================================

interface ImageModalData {
  url: string;
  imageName: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const imageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15 },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ImageModal() {
  const [imageData, setImageData] = useState<ImageModalData | undefined>(undefined);
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Event listener for opening modal
  useEffect(() => {
    const handleOpenModal = (event: Event) => {
      const customEvent = event as CustomEvent<ImageModalData>;
      setImageData(customEvent.detail);
      setZoom(1);
    };

    window.addEventListener('openImageModal', handleOpenModal);
    return () => window.removeEventListener('openImageModal', handleOpenModal);
  }, []);

  // Focus management
  useEffect(() => {
    if (imageData && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [imageData]);

  // Close handler
  const handleClose = useCallback(() => {
    setImageData(undefined);
    setZoom(1);
  }, []);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!imageData) return;
    setIsDownloading(true);
    try {
      await downloadImage(imageData.url, imageData.imageName);
    } finally {
      setIsDownloading(false);
    }
  }, [imageData]);

  // Backdrop click handler
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
      case '+':
      case '=':
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 3));
        break;
      case '-':
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
        break;
      case '0':
        e.preventDefault();
        setZoom(1);
        break;
    }
  }, [handleClose]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  return (
    <AnimatePresence>
      {imageData && (
        <motion.div
          ref={modalRef}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label={`Image viewer: ${imageData.imageName}`}
          tabIndex={-1}
        >
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative max-w-[95vw] sm:max-w-7xl max-h-[90vh] w-full"
          >
            {/* Top Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 sm:p-4">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur rounded-lg p-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                  className="
                    p-2 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-lg text-white transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  "
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white text-sm font-medium min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                  className="
                    p-2 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed
                    rounded-lg text-white transition-colors
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  "
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              {/* Close Button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleClose}
                className="
                  p-2 sm:p-2.5 bg-slate-800/80 hover:bg-slate-700 backdrop-blur
                  rounded-lg text-white transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                "
                aria-label="Close image viewer"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex items-center justify-center max-h-[70vh] sm:max-h-[80vh] overflow-auto">
              <img
                src={imageData.url}
                alt={imageData.imageName}
                className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
                loading="lazy"
              />
            </div>

            {/* Footer with Download Button */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:justify-between bg-slate-800/80 backdrop-blur rounded-lg p-3 sm:p-4">
              <span className="text-white text-xs sm:text-sm truncate w-full sm:flex-1 sm:mr-4">
                {imageData.imageName}
              </span>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="
                  flex items-center gap-2 px-4 py-2.5
                  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                  text-white text-sm sm:text-base font-semibold rounded-lg transition-colors
                  w-full sm:w-auto justify-center
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                "
              >
                <Download className="w-4 h-4" />
                {isDownloading ? 'Downloading...' : 'Download'}
              </button>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-2 text-center text-slate-400 text-xs">
              <span className="hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">ESC</kbd> to close
                {' · '}
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">+</kbd>/<kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">-</kbd> to zoom
                {' · '}
                <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">0</kbd> to reset
              </span>
              <span className="sm:hidden">Tap outside to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ImageModal;
