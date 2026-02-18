import { useState, useEffect } from 'react';
import { geoScoreToTier } from '../data/geoMetricDescriptions';

interface GeoOverallScoreProps {
  score: number;
  summary?: string;
  grade?: string;
  theme: string;
}

// Reuse CountUp component
function CountUp({ value = 0, duration = 900, suffix = "" }: { value?: number, duration?: number, suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now(); const from = 0; const to = Number(value) || 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display}{suffix}</>;
}

// Reuse GaugeRing component
function GaugeRing({ value = 0, size = 56, stroke = 8, track = "var(--track)", color, theme }: { value?: number, size?: number, stroke?: number, track?: string, color?: string, theme?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  const tier = geoScoreToTier(v, theme === 'dark');
  const strokeColor = color || tier.bar;
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={strokeColor}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--text)">
        {v}%
      </text>
    </svg>
  );
}

// Badge component with purple GEO theme
function Badge({ value, style, theme }: { value: number, style?: React.CSSProperties, theme?: string }) {
  const tier = geoScoreToTier(value, theme === 'dark');
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: tier.bg,
        color: tier.fg,
        border: `1px solid ${tier.fg}20`,
        ...style,
      }}
    >
      {tier.label}
    </span>
  );
}

export function GeoOverallScore({ score, summary, grade, theme }: GeoOverallScoreProps) {
  const [showInfo, setShowInfo] = useState(false);
  const tier = geoScoreToTier(score, theme === 'dark');

  return (
    <div
      className="card"
      style={{
        border: 'var(--hairline)',
        borderRadius: 16,
        padding: 16,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}
    >
      {/* Header with info button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <div style={{
          color: '#8b5cf6',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>🤖</span>
          Overall GEO Score
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            transition: 'var(--trans)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elev-1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          aria-label="Show GEO score information"
          aria-expanded={showInfo}
        >
          ℹ️ {showInfo ? 'Hide' : 'Info'}
        </button>
      </div>

      {/* Main score display */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <GaugeRing
            value={score}
            size={72}
            stroke={10}
            theme={theme}
            aria-label={`Overall GEO score: ${score} out of 100`}
          />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
              <CountUp value={score} suffix="/100" />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
              {summary || tier.label}
            </div>
            {grade && (
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: tier.fg,
                marginTop: 4
              }}>
                Grade: {grade}
              </div>
            )}
          </div>
        </div>
        <Badge value={score} theme={theme} />
      </div>

      {/* Expandable info panel */}
      {showInfo && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: 'var(--bg-elev-1)',
          borderRadius: 12,
          border: 'var(--hairline)',
          fontSize: 13,
          lineHeight: 1.5
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
            What is GEO (Generative Engine Optimization)?
          </div>
          <div style={{ color: 'var(--text-dim)', marginBottom: 12 }}>
            GEO optimizes your content to be cited by AI platforms like ChatGPT, Claude, Perplexity, and Gemini.
            Unlike traditional SEO (which focuses on search engine rankings), GEO focuses on being <strong>citation-worthy</strong> rather than just click-worthy.
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
            Why GEO Matters:
          </div>
          <ul style={{
            margin: '0 0 12px 0',
            paddingLeft: 20,
            color: 'var(--text-dim)',
            fontSize: 12
          }}>
            <li>37% of product discovery starts in AI interfaces</li>
            <li>36 million U.S. users will use AI as primary search by 2028</li>
            <li>40% visibility improvement possible with GEO optimization</li>
            <li>Author credibility increases AI citations by 340%</li>
          </ul>

          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
            8 Core GEO Metrics:
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-dim)',
            padding: 8,
            background: 'var(--bg)',
            borderRadius: 6
          }}>
            <strong>Citation Structure</strong> • <strong>Source Credibility</strong> • <strong>Structured Data</strong> •
            <strong> Content Freshness</strong> • <strong>Author Attribution</strong> • <strong>Factual Clarity</strong> •
            <strong> Data Presence</strong> • <strong>Content Depth</strong>
          </div>

          <div style={{
            marginTop: 12,
            fontSize: 12,
            color: 'var(--text-dim)',
            padding: 8,
            background: 'var(--bg)',
            borderRadius: 6
          }}>
            <strong>Score Ranges:</strong><br />
            90-100: Excellent (High citation probability) | 75-89: Good | 60-74: Fair | 40-59: Needs Improvement | 0-39: Poor
          </div>
        </div>
      )}
    </div>
  );
}
