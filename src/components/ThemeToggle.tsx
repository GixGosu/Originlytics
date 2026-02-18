import { useTheme, type Theme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const themes: Array<{ value: Theme; icon: string; label: string }> = [
    { value: 'light', icon: '☀️', label: 'Light' },
    { value: 'dark', icon: '🌙', label: 'Dark' },
    { value: 'system', icon: '💻', label: 'Auto' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        background: 'var(--bg-secondary)',
        padding: 4,
        borderRadius: 8,
        border: 'var(--hairline)'
      }}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {themes.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          style={{
            padding: '6px 12px',
            border: 'none',
            borderRadius: 6,
            background: theme === value ? 'var(--card)' : 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: theme === value ? 600 : 400,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
            boxShadow: theme === value ? 'var(--shadow-1)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (theme !== value) {
              e.currentTarget.style.background = 'var(--hover-overlay)';
            }
          }}
          onMouseLeave={(e) => {
            if (theme !== value) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          role="radio"
          aria-checked={theme === value}
          aria-label={`${label} theme`}
          title={value === 'system' ? `System (currently ${effectiveTheme})` : `${label} theme`}
        >
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
