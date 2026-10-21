import { useState, useEffect, useCallback, useRef } from 'react';

// Tiny in-memory cross-component endpoint cache for instant perceived load on menu switches
// (stale data returned immediately while background revalidation keeps metrics fresh)
// Heavily reduces load feel on all sidebar pages especially when switching back and forth.
const endpointCache = new Map(); // endpoint -> {data, ts}

// Global toast dispatch — used by useApi and apiPost to surface errors
export function showToast(message, type = 'error', duration = 6000) {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type, duration } }));
}

// Report errors to the server-side error log
export function reportError(message, source = 'client', details = {}) {
  try {
    const token = localStorage.getItem('dashToken');
    if (!token) return;
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message, source, details }),
    }).catch(() => {});
  } catch { /* ignore */ }
}

export function useApi(endpoint, refreshInterval = 0) {
  const cacheKey = endpoint;
  const cached = endpointCache.get(cacheKey);
  const [data, setData] = useState(() => cached ? cached.data : null);
  const [loading, setLoading] = useState(() => !cached); // skip initial spinner if we had prior data
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false); // prevent duplicate initial fetches from StrictMode

  const fetchData = useCallback(async (isBackground = false, { signal } = {}) => {
    const token = localStorage.getItem('dashToken');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (isBackground) setIsRefreshing(true);
    else if (!fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
    }

    let aborted = false;
    try {
      const res = await fetch(`/api${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (signal?.aborted) aborted = true;
      if (aborted) return;
      if (res.status === 401) {
        localStorage.removeItem('dashToken');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (signal?.aborted) return;

      endpointCache.set(cacheKey, { data: json, ts: Date.now() });
      setData(json);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      // Report to server-side error log
      reportError(err.message, 'client', { url: endpoint, status: err.message.includes('HTTP') ? err.message.split(' ')[1] : '' });
      // Show toast for background/auto refreshes (silent for initial load to avoid spam)
      if (isBackground && refreshInterval > 0) {
        showToast(`Failed to load ${endpoint}: ${err.message}`, 'error', 5000);
      }
    } finally {
      if (!aborted) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [endpoint, cacheKey, refreshInterval]);

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
  const token = localStorage.getItem('dashToken');
  if (!token) {
    window.location.href = '/login';
    throw new Error('Login required');
  }

  let res;
  try {
    res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    reportError(`POST ${endpoint} failed: ${err.message}`, 'client', { url: endpoint });
    showToast(`Network error: ${err.message}`, 'error');
    throw err;
  }

  if (endpoint === '/sync') {
    // Force-fresh all cached data from TG: clear in-memory endpointCache so open pages + any sidebar switch re-pulls live results as soon as sync completes.
    endpointCache.clear();
    window.dispatchEvent(new CustomEvent('api-refresh'));
  }

  return res.json();
}