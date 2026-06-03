import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically navigate to the dashboard homepage, completely skipping login page
    localStorage.setItem('dashToken', 'bypass-no-password');
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-text-primary">Loading Dashboard...</h1>
      </div>
    </div>
  );
}
