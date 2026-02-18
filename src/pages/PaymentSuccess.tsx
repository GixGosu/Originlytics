import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PaymentSuccess() {
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

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
        maxWidth: 500,
        width: '100%',
        padding: 40,
        background: 'var(--card)',
        borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
        <h1 style={{ margin: '0 0 16px 0', color: '#22c55e', fontSize: 32 }}>Payment Successful!</h1>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-dim)', fontSize: 16 }}>
          Your tokens have been added to your account.
        </p>
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14 }}>
          Redirecting to homepage in {countdown} seconds...
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 24,
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          Go to Homepage Now
        </button>
      </div>
    </div>
  );
}
