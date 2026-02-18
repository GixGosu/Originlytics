import { useNavigate } from 'react-router-dom';

export function PaymentCancel() {
  const navigate = useNavigate();

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
        <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
        <h1 style={{ margin: '0 0 16px 0', color: '#ef4444', fontSize: 32 }}>Payment Cancelled</h1>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-dim)', fontSize: 16 }}>
          Your payment was cancelled. No charges were made.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            marginRight: 12
          }}
        >
          Go to Homepage
        </button>
      </div>
    </div>
  );
}
