import { useState, useEffect, useCallback } from 'react';

// Tiny in-memory cross-component endpoint cache for instant perceived load on menu switches
// (stale data returned immediately while background revalidation keeps metrics fresh)
// Heavily reduces load feel on all sidebar pages especially when switching back and forth.
const endpointCache = new Map(); // endpoint -> {data, ts}

export function useApi(endpoint, refreshInterval = 0) {
  const cacheKey = endpoint;
  const cached = endpointCache.get(cacheKey);
  const [data, setData] = useState(() => cached ? cached.data : null);
  const [loading, setLoading] = useState(() => !cached); // skip initial spinner if we had prior data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isBackground = false) => {
    const token = localStorage.getItem('dashToken') || 'bypass-no-password';
    if (!localStorage.getItem('dashToken')) {
      localStorage.setItem('dashToken', 'bypass-no-password');
    }

    if (isBackground) setIsRefreshing(true);
    else if (!data) setLoading(true); // first time only

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

      endpointCache.set(cacheKey, { data: json, ts: Date.now() });
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [endpoint, data, cacheKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const now = Date.now();
    const c = endpointCache.get(cacheKey);
    if (c && (now - c.ts) < 16000) {
      // Have recent cached data already hydrated from useState initializer (instant metrics/load across menus).
      // Background-refresh only to stay fresh. No setState in effect body here to obey React purity.
      setTimeout(() => fetchData(true), 90);
    } else {
      fetchData(false);
    }

    const handleGlobalRefresh = () => {
      fetchData(true);
    };
    window.addEventListener('api-refresh', handleGlobalRefresh);

    let interval;
    if (refreshInterval > 0) {
      interval = setInterval(() => fetchData(true), refreshInterval);
    }

    return () => {
      window.removeEventListener('api-refresh', handleGlobalRefresh);
      if (interval) clearInterval(interval);
    };
  }, [fetchData, refreshInterval, cacheKey]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, isRefreshing, error, refresh };
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
    // Force-fresh all cached data from TG: clear in-memory endpointCache so open pages + any sidebar switch re-pulls live results as soon as sync completes.
    endpointCache.clear();
    window.dispatchEvent(new CustomEvent('api-refresh'));
  }

  return res.json();
}
