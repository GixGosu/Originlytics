/**
 * AuthModal Component
 * Simple login/signup modal for authentication
 */

import { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

// Get reCAPTCHA site key from environment (Vite exposes VITE_ prefixed vars)
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// Load reCAPTCHA script
function loadRecaptchaScript() {
  if (typeof window === 'undefined' || !RECAPTCHA_SITE_KEY) return;
  
  // Check if already loaded
  if (document.querySelector(`script[src*="recaptcha"]`)) return;
  
  const script = document.createElement('script');
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// Get reCAPTCHA token
function getRecaptchaToken(): Promise<string> {
  return new Promise((resolve) => {
    if (!RECAPTCHA_SITE_KEY) {
      resolve(''); // Return empty string if not configured (dev mode)
      return;
    }
    
    // Validate site key format (should start with 6L for v3)
    if (!RECAPTCHA_SITE_KEY.startsWith('6L')) {
      console.warn('[reCAPTCHA] Invalid site key format, skipping verification');
      resolve('');
      return;
    }
    
    if (typeof window === 'undefined' || !(window as any).grecaptcha) {
      console.warn('[reCAPTCHA] grecaptcha not loaded, skipping verification');
      resolve(''); // Don't block signup if reCAPTCHA fails to load
      return;
    }
    
    try {
      (window as any).grecaptcha.ready(() => {
        (window as any).grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action: 'signup' })
          .then(resolve)
          .catch((err: any) => {
            console.warn('[reCAPTCHA] Execution failed:', err);
            resolve(''); // Don't block signup
          });
      });
    } catch (err) {
      console.warn('[reCAPTCHA] Error:', err);
      resolve(''); // Don't block signup
    }
  });
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Load reCAPTCHA script on mount
  useEffect(() => {
    loadRecaptchaScript();
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get reCAPTCHA token for signup (not for login)
      let recaptchaToken = '';
      if (mode === 'signup') {
        recaptchaToken = await getRecaptchaToken();
        // Note: getRecaptchaToken now returns empty string on failure instead of throwing
      }
      
      // Use relative URLs - works in both dev and production
      const endpoint = mode === 'login'
        ? '/api/auth/login'
        : '/api/auth/signup';
      
      const requestBody: any = { email, password };
      if (mode === 'signup' && recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (mode === 'signup') {
        // Show success message for signup
        setError(''); // Clear any errors
        alert(data.message || 'Signup successful! Please check your email to verify your account.');
        setMode('login'); // Switch to login mode
        setLoading(false);
        return;
      }

      // For login: Store token and call success handler
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        onSuccess(data.token);
        
        // Reset form
        setEmail('');
        setPassword('');
        onClose();
      } else {
        throw new Error('No token received from login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal">
      <div className="auth-modal__backdrop" onClick={onClose} />
      
      <div className="auth-modal__content">
        <button className="auth-modal__close" onClick={onClose}>
          ✕
        </button>
        
        <h2 className="auth-modal__title">
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="auth-modal__form">
          <div className="auth-modal__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          
          <div className="auth-modal__field">
            <label htmlFor="password">
              Password
              {mode === 'signup' && (
                <small style={{ display: 'block', fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                  Min 12 chars, include uppercase, lowercase, number & special character
                </small>
              )}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={mode === 'signup' ? 12 : 6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          
          {error && (
            <div className="auth-modal__error">
              ⚠️ {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-modal__button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
          
          {mode === 'signup' && RECAPTCHA_SITE_KEY && (
            <p className="auth-modal__recaptcha-notice">
              Protected by reCAPTCHA. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a> & <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            </p>
          )}
        </form>
        
        <div className="auth-modal__toggle">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('signup'); setError(''); }}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); }}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const authModalStyles = `
.auth-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

.auth-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
}

.auth-modal__content {
  position: relative;
  background: var(--card);
  border-radius: 20px;
  padding: 40px;
  max-width: 400px;
  width: 100%;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.auth-modal__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--trans);
}

.auth-modal__close:hover {
  background: var(--bg);
  color: var(--text);
  transform: rotate(90deg);
}

.auth-modal__title {
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 24px;
  text-align: center;
}

.auth-modal__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.auth-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auth-modal__field label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.auth-modal__field input {
  padding: 12px 16px;
  border: 2px solid var(--hairline);
  border-radius: 10px;
  font-size: 15px;
  background: var(--bg);
  color: var(--text);
  transition: all var(--trans);
}

.auth-modal__field input:focus {
  outline: none;
  border-color: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  box-shadow: 0 0 0 3px hsl(var(--accent-h), var(--accent-s), var(--accent-l), 0.1);
}

.auth-modal__error {
  padding: 12px;
  background: hsl(0, 84%, 60%, 0.1);
  color: hsl(0, 84%, 60%);
  border: 1px solid hsl(0, 84%, 60%, 0.3);
  border-radius: 8px;
  font-size: 14px;
}

.auth-modal__button {
  width: 100%;
  padding: 14px 24px;
  background: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--trans);
}

.auth-modal__button:hover:not(:disabled) {
  background: hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) - 5%));
  transform: translateY(-1px);
  box-shadow: 0 8px 24px hsl(var(--accent-h), var(--accent-s), var(--accent-l), 0.3);
}

.auth-modal__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-modal__recaptcha-notice {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
  margin: -8px 0 0;
  padding: 0;
}

.auth-modal__recaptcha-notice a {
  color: var(--primary);
  text-decoration: none;
}

.auth-modal__recaptcha-notice a:hover {
  text-decoration: underline;
}

.auth-modal__toggle {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
}

.auth-modal__toggle button {
  background: none;
  border: none;
  color: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

.auth-modal__toggle button:hover {
  color: hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) - 10%));
}

[data-theme="dark"] .auth-modal__error {
  background: hsl(0, 84%, 60%, 0.15);
  color: hsl(0, 84%, 70%);
}
`;
