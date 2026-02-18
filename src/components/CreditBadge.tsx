/**
 * CreditBadge Component
 * Displays user's credit balance in the header
 * Shows "Sign In" if not authenticated
 */

interface CreditBadgeProps {
  balance: number | null;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onBuyCredits: () => void;
}

export function CreditBadge({ balance, isAuthenticated, onSignIn, onBuyCredits }: CreditBadgeProps) {
  if (!isAuthenticated) {
    return (
      <button
        onClick={onSignIn}
        className="credit-badge credit-badge--signin"
        aria-label="Sign in to access Pro features"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="4" strokeWidth="2" />
        </svg>
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="credit-badge-container">
      <div className="credit-badge credit-badge--balance">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="credit-count">{balance ?? 0}</span>
        <span className="credit-label">credits</span>
      </div>
      
      <button
        onClick={onBuyCredits}
        className="buy-credits-btn"
        aria-label="Buy more credits"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Buy
      </button>
    </div>
  );
}

// CSS styles (to be added to App.css or a separate stylesheet)
export const creditBadgeStyles = `
.credit-badge-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.credit-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--card-contrast);
  border: var(--hairline);
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  transition: all var(--trans);
}

.credit-badge--signin {
  cursor: pointer;
  background: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  color: #1a1a1a;
  border: none;
}

.credit-badge--signin:hover {
  background: hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) - 5%));
  transform: translateY(-1px);
}

.credit-badge--balance {
  cursor: default;
}

.credit-badge svg {
  opacity: 0.7;
}

.credit-count {
  font-weight: 700;
  font-size: 16px;
  color: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
}

.credit-label {
  opacity: 0.6;
  font-size: 13px;
}

.buy-credits-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 10px;
  background: hsl(var(--accent-h), var(--accent-s), var(--accent-l));
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--trans);
}

.buy-credits-btn:hover {
  background: hsl(var(--accent-h), var(--accent-s), calc(var(--accent-l) - 5%));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.3);
}

.buy-credits-btn svg {
  stroke-width: 2.5;
}
`;
