/**
 * Environment Configuration
 */

export const environment = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  livekitUrl: import.meta.env.VITE_LIVEKIT_URL || '',
  appEnv: import.meta.env.MODE || 'development',
};

export function logEnvironmentConfig() {
  if (import.meta.env.DEV) {
    console.log('[Environment] Config loaded:', {
      apiBaseUrl: environment.apiBaseUrl ? 'Set' : 'Missing',
      livekitUrl: environment.livekitUrl ? 'Set' : 'Missing',
      mode: environment.appEnv,
    });
  }
}

export function validateEnvironmentConfig() {
  const errors: string[] = [];

  if (!import.meta.env.VITE_API_BASE_URL) {
    errors.push('VITE_API_BASE_URL is required');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

export default environment;
