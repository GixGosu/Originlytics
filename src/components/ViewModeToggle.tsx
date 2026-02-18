interface ViewModeToggleProps {
  viewMode: 'simple' | 'advanced';
  onChange: (mode: 'simple' | 'advanced') => void;
  theme: 'light' | 'dark';
}

export function ViewModeToggle({ viewMode, onChange }: ViewModeToggleProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: 'var(--bg-elev-1)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        fontSize: 13,
        fontWeight: 600
      }}
    >
      <button
        onClick={() => onChange('simple')}
        style={{
          padding: '6px 16px',
          borderRadius: 8,
          border: 'none',
          background: viewMode === 'simple' ? 'var(--accent)' : 'transparent',
          color: viewMode === 'simple' ? '#ffffff' : 'var(--text-dim)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontWeight: viewMode === 'simple' ? 700 : 500,
          fontSize: 13
        }}
      >
        Simple
      </button>
      <button
        onClick={() => onChange('advanced')}
        style={{
          padding: '6px 16px',
          borderRadius: 8,
          border: 'none',
          background: viewMode === 'advanced' ? 'var(--accent)' : 'transparent',
          color: viewMode === 'advanced' ? '#ffffff' : 'var(--text-dim)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontWeight: viewMode === 'advanced' ? 700 : 500,
          fontSize: 13
        }}
      >
        Advanced
      </button>
    </div>
  );
}

export const viewModeToggleStyles = `
  /* ViewModeToggle hover effects */
  .view-mode-toggle button:hover {
    opacity: 0.8;
  }
`;
