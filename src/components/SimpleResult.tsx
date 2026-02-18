
interface SimpleResultProps {
  aiLikelihood: number;
  interpretation: string;
  confidence: number;
  metricsAnalyzed: number;
  theme: 'light' | 'dark';
  onViewDetails: () => void;
}

export function SimpleResult({
  aiLikelihood,
  interpretation,
  confidence,
  metricsAnalyzed,
  theme,
  onViewDetails
}: SimpleResultProps) {
  // Determine confidence level and color
  const confidenceLevel = confidence >= 70 ? 'High' : confidence >= 50 ? 'Medium' : 'Low';
  const confidenceColor = confidence >= 70 ? '#22c55e' : confidence >= 50 ? '#fbbf24' : '#f87171';

  // Determine if result is AI or Human
  const isHuman = aiLikelihood < 50;
  const resultIcon = isHuman ? '✅' : '⚠️';
  const resultText = isHuman ? 'Likely Human Written' : 'Possible AI Content';
  const resultColor = isHuman
    ? (theme === 'dark' ? '#22c55e' : '#16a34a')
    : (theme === 'dark' ? '#f59e0b' : '#d97706');

  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        padding: 40,
        textAlign: 'center',
        background: 'var(--card)',
        borderRadius: 20,
        boxShadow: 'var(--shadow-2)'
      }}
    >
      {/* Large Gauge Ring */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 24
      }}>
        <svg
          width={160}
          height={160}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx={80}
            cy={80}
            r={70}
            fill="none"
            stroke="var(--border)"
            strokeWidth={12}
          />
          {/* Progress circle */}
          <circle
            cx={80}
            cy={80}
            r={70}
            fill="none"
            stroke={resultColor}
            strokeWidth={12}
            strokeDasharray={`${(aiLikelihood / 100) * (2 * Math.PI * 70)} ${2 * Math.PI * 70}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.6s ease-out'
            }}
          />
          {/* Center text */}
          <text
            x={80}
            y={80}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 36,
              fontWeight: 700,
              fill: 'var(--text)',
              transform: 'rotate(90deg)',
              transformOrigin: '80px 80px'
            }}
          >
            {aiLikelihood}%
          </text>
        </svg>
      </div>

      {/* AI Likelihood Label */}
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        color: 'var(--text)',
        marginBottom: 8
      }}>
        {aiLikelihood}% AI Likelihood
      </div>

      {/* Result Interpretation */}
      <div style={{
        fontSize: 20,
        fontWeight: 600,
        color: resultColor,
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }}>
        <span style={{ fontSize: 24 }}>{resultIcon}</span>
        {resultText}
      </div>

      {/* Status Checkmarks */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 32,
        textAlign: 'left',
        maxWidth: 320,
        margin: '0 auto 32px auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          color: 'var(--text-dim)'
        }}>
          <span style={{
            color: '#22c55e',
            fontSize: 18,
            fontWeight: 700
          }}>✓</span>
          Analysis complete
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          color: 'var(--text-dim)'
        }}>
          <span style={{
            color: '#22c55e',
            fontSize: 18,
            fontWeight: 700
          }}>✓</span>
          {metricsAnalyzed} metrics analyzed
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          color: 'var(--text-dim)'
        }}>
          <span style={{
            color: '#22c55e',
            fontSize: 18,
            fontWeight: 700
          }}>✓</span>
          <span>
            Confidence: <strong style={{ color: confidenceColor }}>{confidenceLevel}</strong>
          </span>
        </div>
      </div>

      {/* View Detailed Analysis Button */}
      <button
        onClick={onViewDetails}
        className="btn btn-outline"
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '12px 24px',
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'var(--bg-elev-1)',
          border: '2px solid var(--border)',
          color: 'var(--text)',
          cursor: 'pointer',
          borderRadius: 12,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-elev-2)';
          e.currentTarget.style.borderColor = 'var(--text-dim)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-elev-1)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        View Detailed Analysis
        <span style={{ fontSize: 18 }}>→</span>
      </button>

      {/* Additional context */}
      <div style={{
        marginTop: 24,
        fontSize: 12,
        color: 'var(--text-dim)',
        fontStyle: 'italic'
      }}>
        {interpretation}
      </div>
    </div>
  );
}

export const simpleResultStyles = `
  /* Animations for SimpleResult */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .app-results .card {
    animation: fadeIn 0.4s ease-out;
  }
`;
