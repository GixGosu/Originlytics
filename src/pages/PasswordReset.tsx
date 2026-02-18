import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const getApiUrl = () => {
  if (window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return 'http://localhost:5002';
};

export function PasswordReset() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'ready' | 'loading' | 'success' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have an access token in the URL hash
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) {
      setStatus('error');
      setMessage('Invalid password reset link');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 12) {
      setMessage('Password must be at least 12 characters');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      // Extract access token from URL hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');

      if (!accessToken) {
        throw new Error('No access token found');
      }

      // Call our backend to update password
      const response = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      setStatus('success');
      setMessage('Password updated successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to reset password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 20
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
        padding: 40,
        background: 'var(--card)',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', color: 'var(--text)', textAlign: 'center' }}>
          Reset Your Password
        </h2>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#22c55e', margin: 0 }}>{message}</p>
          </div>
        ) : status === 'error' && !password ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <p style={{ color: '#ef4444', marginBottom: 16 }}>{message}</p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Go to Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={12}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--hairline)',
                  fontSize: 14,
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              />
              <small style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block', marginTop: 4 }}>
                Min 12 characters, include uppercase, lowercase, number & special character
              </small>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={12}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  border: '1px solid var(--hairline)',
                  fontSize: 14,
                  background: 'var(--bg)',
                  color: 'var(--text)'
                }}
              />
            </div>

            {message && status === 'error' && (
              <div style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: 13,
                marginBottom: 16
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                width: '100%',
                padding: '12px',
                background: status === 'loading' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer'
              }}
            >
              {status === 'loading' ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
