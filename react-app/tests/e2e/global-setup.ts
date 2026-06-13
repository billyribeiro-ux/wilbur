/**
 * Global Setup for E2E Tests
 */

async function globalSetup() {
  process.env.VITE_E2E = '1';
  process.env.NODE_ENV = 'test';

  if (!process.env.VITE_API_BASE_URL) {
    process.env.VITE_API_BASE_URL = 'http://localhost:3001';
  }

  console.log('[E2E Setup] Environment configured for testing');
}

export default globalSetup;
