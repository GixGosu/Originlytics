import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const getApiUrl = () => {
  if (window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  return 'http://localhost:5002';
};

export function AuthConfirm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your email...');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token) {
          setStatus('error');
          setMessage('Invalid confirmation link - no token provided');
          return;
        }

        // Call backend to verify the token with Supabase
        const response = await fetch(`${getApiUrl()}/api/auth/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token, type })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        const data = await response.json();
        
        // Store the auth token
        if (data.access_token) {
          localStorage.setItem('auth_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
        }

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting...');
        
        setTimeout(() => {
          navigate('/');
          window.location.reload(); // Reload to update auth state
        }, 2000);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Confirmation failed. Please try again.');
      }
    };

    confirmEmail();
  }, [navigate, searchParams]);

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
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Confirming Email</h2>
            <p style={{ margin: 0, color: 'var(--text-dim)' }}>{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>Success!</h2>
            <p style={{ margin: 0, color: 'var(--text-dim)' }}>{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>Error</h2>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-dim)' }}>{message}</p>
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
          </>
        )}
      </div>
    </div>
  );
}
