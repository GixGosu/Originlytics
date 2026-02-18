import { useState, useEffect } from 'react';
import { geoScoreToTier, GEO_METRIC_DESCRIPTIONS } from '../data/geoMetricDescriptions';

interface GeoMetricRowProps {
  metric: string;
  score: number;
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

export function GeoMetricRow({ metric, score, theme }: GeoMetricRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const tier = geoScoreToTier(score, theme === 'dark');
  const description = GEO_METRIC_DESCRIPTIONS[metric];

  // Status icon based on score (GEO uses different thresholds than SEO)
  const statusIcon = score >= 90 ? '✓' : score >= 75 ? '✓' : score >= 60 ? '⚠️' : '✗';
  const statusColor = score >= 90 ? '#8b5cf6' : score >= 75 ? '#3b82f6' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      background: 'var(--bg-elev-1)',
      border: 'var(--hairline)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
            {metric}
          </span>
          {description && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: 12,
                padding: 2,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Click for details"
              aria-label={`Show details for ${metric}`}
            >
              ℹ️
            </button>
          )}
        </div>
        <span style={{
          fontSize: 13,
          color: 'var(--text-dim)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <CountUp value={score} suffix="/100" />
          <span style={{ fontSize: 16, color: statusColor }}>{statusIcon}</span>
        </span>
      </div>

      {/* Progress bar - purple theme for GEO */}
      <div style={{
        height: 6,
        width: '100%',
        background: 'var(--track)',
        borderRadius: 999,
        overflow: 'hidden'
      }}>
        <div
          style={{
            width: `${score}%`,
            height: 6,
            background: tier.bar,
            borderRadius: 999,
            transition: 'width 500ms ease'
          }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${metric} score: ${score} out of 100`}
        />
      </div>

      {/* Expandable details */}
      {showDetails && description && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: 'var(--bg)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-dim)',
          border: 'var(--hairline)'
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Description:</strong> {description.description}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Best Practice:</strong> {description.good_range}
          </div>
          <div style={{
            marginTop: 8,
            padding: 8,
            background: 'var(--bg-elev-1)',
            borderRadius: 6,
            border: '1px solid #8b5cf620'
          }}>
            <strong style={{ color: '#8b5cf6' }}>AI Impact:</strong> {description.ai_impact}
          </div>
        </div>
      )}
    </div>
  );
}
