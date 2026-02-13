/**
 * main.tsx — Wilbur Trading Room (Entry Point)
 * - Validates environment configuration
 * - Initializes sound service on first user interaction
 * - Preloads Spotify SDK
 * - Renders the application with error boundary
 * - Tracks Web Vitals in production
 */

import { createRoot } from 'react-dom/client';

import App from './app/App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { validateEnvironmentConfig, logEnvironmentConfig } from "./config/environment";
import { initializeSoundService } from './services/soundService';
import { initializeGlobalErrorHandlers } from './utils/globalErrorHandlers';

// Initialize global error handlers
initializeGlobalErrorHandlers();

// ═══════════════════════════════════════════════════════════════
// 1. Environment Validation
// ═══════════════════════════════════════════════════════════════
function validateEnvironment() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const isE2ERoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/__test_');

  if (!apiBaseUrl && !isE2ERoute) {
    console.warn('[ENV] VITE_API_BASE_URL not set, defaulting to http://localhost:3000');
  }

  const envValidation = validateEnvironmentConfig();
  if (!envValidation.valid) {
    console.warn('[APP] Environment configuration warnings:');
    envValidation.errors.forEach((error) => console.warn(`  - ${error}`));

    const criticalErrors = envValidation.errors.filter(
      (err) => err.includes('required') || err.includes('must use HTTPS')
    );

    if (criticalErrors.length > 0 && import.meta.env.PROD && !isE2ERoute) {
      throw new Error(`Critical configuration errors:\n${criticalErrors.join('\n')}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 2. Validate + Log Environment
// ═══════════════════════════════════════════════════════════════
try {
  validateEnvironment();

  if (import.meta.env.DEV) {
    logEnvironmentConfig();
  }
} catch (error) {
  console.error('[APP] Configuration error:', error);

  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #fff; font-family: system-ui;">
      <div style="text-align: center; max-width: 600px; padding: 2rem;">
        <h1 style="color: #ef4444; margin-bottom: 1rem;">Configuration Error</h1>
        <p style="color: #94a3b8; margin-bottom: 1.5rem;">${
          error instanceof Error ? error.message : 'Unknown error'
        }</p>
        <p style="color: #64748b; font-size: 0.875rem;">Please check your <strong>.env</strong> file and restart the app.</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">Reload</button>
      </div>
    </div>
  `;
  throw error;
}

// ═══════════════════════════════════════════════════════════════
// 3. Initialize Sound Service (on user interaction)
// ═══════════════════════════════════════════════════════════════
let soundInitialized = false;
const initializeAudioOnInteraction = () => {
  if (soundInitialized) return;
  soundInitialized = true;

  initializeSoundService().catch(() => {
    // Silent audio init failure - non-critical
  });

  document.removeEventListener('click', initializeAudioOnInteraction);
  document.removeEventListener('keydown', initializeAudioOnInteraction);
  document.removeEventListener('touchstart', initializeAudioOnInteraction);
};

document.addEventListener('click', initializeAudioOnInteraction, { once: true, passive: true });
document.addEventListener('keydown', initializeAudioOnInteraction, { once: true, passive: true });
document.addEventListener('touchstart', initializeAudioOnInteraction, { once: true, passive: true });

// ═══════════════════════════════════════════════════════════════
// 4. Preload Spotify SDK
// ═══════════════════════════════════════════════════════════════
if (!document.querySelector('script[src*="spotify-player"]')) {
  const spotifyScript = document.createElement('script');
  spotifyScript.src = 'https://sdk.scdn.co/spotify-player.js';
  spotifyScript.async = true;
  spotifyScript.id = 'spotify-sdk-script';
  document.head.appendChild(spotifyScript);
}

// ═══════════════════════════════════════════════════════════════
// 5. Render Application
// ═══════════════════════════════════════════════════════════════
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// ═══════════════════════════════════════════════════════════════
// 6. Performance Monitoring (Production Only)
// ═══════════════════════════════════════════════════════════════
if (import.meta.env.PROD) {
  import('./lib/monitoring')
    .then(({ initializeWebVitals }) => {
      initializeWebVitals();
    })
    .catch((err) => {
      console.warn('[APP] Failed to initialize Web Vitals:', err);
    });
}
