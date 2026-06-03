import { useState, useEffect, useCallback } from 'react';

export function useApi(endpoint, refreshInterval = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    // Always fetch — server auth is bypassed for local/dev use. Use stored token or the known bypass token
    // so pages show persisted real metrics/analytics immediately on open (even without explicitly hitting login).
    const token = localStorage.getItem('dashToken') || 'bypass-no-password';
    if (!localStorage.getItem('dashToken')) {
      localStorage.setItem('dashToken', 'bypass-no-password');
    }
    try {
      const res = await fetch(`/api${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('dashToken');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();

    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener('api-refresh', handleGlobalRefresh);

    let interval;
    if (refreshInterval > 0) {
      interval = setInterval(fetchData, refreshInterval);
    }

    return () => {
      window.removeEventListener('api-refresh', handleGlobalRefresh);
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refresh: fetchData };
}

export async function apiPost(endpoint, body = {}) {
  // Always post with bypass token if missing — guarantees saves /manual sync succeed and data refreshes even on direct visit.
  let token = localStorage.getItem('dashToken');
  if (!token) {
    token = 'bypass-no-password';
    localStorage.setItem('dashToken', token);
  }
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (endpoint === '/sync') {
    window.dispatchEvent(new CustomEvent('api-refresh'));
  }

  return res.json();
}
