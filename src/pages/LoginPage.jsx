import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        setError(data.error || 'Could not sign in');
        setBusy(false);
        return;
      }
      localStorage.setItem('dashToken', data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-surface-800 border border-border rounded-xl p-6">
        <h1 className="text-xl font-bold text-text-primary mb-2">Dashboard sign in</h1>
        <p className="text-sm text-text-muted mb-4">Use the password set as DASHBOARD_PASSWORD on the server.</p>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="w-full mb-3 px-3 py-2 rounded-lg bg-surface-900 border border-border text-text-primary"
          placeholder="Password"
        />
        {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full py-2 rounded-lg bg-amber-400 text-black font-semibold disabled:opacity-50"
        >
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
