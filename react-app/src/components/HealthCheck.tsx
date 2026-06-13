
// Health check component for monitoring
import { useEffect, useState } from 'react';
import { api } from '../api/client';

export function HealthCheck() {
  const [_status, setStatus] = useState({
    database: 'checking',
    auth: 'checking',
    api: 'checking',
  });

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    // Check API health endpoint
    try {
      await api.get('/health');
      setStatus(s => ({ ...s, api: 'healthy', database: 'healthy' }));
    } catch {
      setStatus(s => ({ ...s, api: 'error', database: 'error' }));
    }

    // Check auth
    try {
      if (api.isAuthenticated()) {
        setStatus(s => ({ ...s, auth: 'healthy' }));
      } else {
        setStatus(s => ({ ...s, auth: 'no_session' }));
      }
    } catch {
      setStatus(s => ({ ...s, auth: 'error' }));
    }
  }

  return null; // Hidden component
}
