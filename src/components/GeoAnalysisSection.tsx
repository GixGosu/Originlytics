import { useState } from 'react';
import type { GeoResult } from '../types/geo';
import { GeoOverallScore } from './GeoOverallScore';
import { GeoMetricRow } from './GeoMetricRow';
import { GeoRecommendations } from './GeoRecommendations';

interface GeoAnalysisSectionProps {
  result: GeoResult | null;
  theme: string;
}

export function GeoAnalysisSection({ result, theme }: GeoAnalysisSectionProps) {
  const [expandedMetrics, setExpandedMetrics] = useState(false);

  if (!result) {
    return (
      <div className="card" style={{
        padding: 32,
        textAlign: 'center',
        color: 'var(--text-dim)',
        border: 'var(--hairline)',
        borderRadius: 16,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
          No GEO data available
        </div>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          Analyze a URL to see Generative Engine Optimization metrics
        </div>
        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--bg-elev-1)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-dim)'
        }}>
          <strong style={{ color: '#8b5cf6' }}>What is GEO?</strong><br />
          Optimize your content to be cited by AI platforms like ChatGPT, Claude, Perplexity, and Gemini
        </div>
      </div>
    );
  }

  // Convert scores object to array and sort by score (descending)
  const metricEntries = result.scores && typeof result.scores === 'object'
    ? Object.entries(result.scores).sort((a, b) => b[1] - a[1])
    : [];
  const visibleMetrics = expandedMetrics ? metricEntries : metricEntries.slice(0, 5);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      {/* Overall Score Section */}
      <GeoOverallScore
        score={result.overall_geo_score}
        summary={result.summary}
        grade={result.grade}
        theme={theme}
      />

      {/* Two-column layout: Metrics + Recommendations */}
      <div
        className="geo-metrics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24
        }}
      >
        {/* Metrics Breakdown */}
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>📊</span>
            GEO Metrics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleMetrics.map(([metric, score]) => (
              <GeoMetricRow
                key={metric}
                metric={metric}
                score={score}
                theme={theme}
              />
            ))}
          </div>

          {metricEntries.length > 5 && (
            <button
              onClick={() => setExpandedMetrics(!expandedMetrics)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: 10,
                background: 'var(--bg-elev-1)',
                border: 'var(--hairline)',
                borderRadius: 8,
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-elev-2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-elev-1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {expandedMetrics ? '▲ Show Less' : `▼ Show All ${metricEntries.length} Metrics`}
            </button>
          )}
        </div>

        {/* Recommendations */}
        <GeoRecommendations recommendations={result.recommendations} />
      </div>

      {/* Citation Readiness & AI Platform Compatibility */}
      {(result.citation_readiness || result.ai_platforms) && (
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>🎯</span>
            AI Platform Compatibility
          </h3>

          {result.citation_readiness && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                Citation Readiness:
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 600,
                background: result.citation_readiness === 'high' ? '#ecfdf520' :
                           result.citation_readiness === 'medium' ? '#fffbeb20' : '#fee2e220',
                color: result.citation_readiness === 'high' ? '#047857' :
                       result.citation_readiness === 'medium' ? '#b45309' : '#b91c1c',
                border: `1px solid ${
                  result.citation_readiness === 'high' ? '#047857' :
                  result.citation_readiness === 'medium' ? '#b45309' : '#b91c1c'
                }40`
              }}>
                {result.citation_readiness === 'high' && '✓ High'}
                {result.citation_readiness === 'medium' && '⚠️ Medium'}
                {result.citation_readiness === 'low' && '✗ Low'}
              </div>
            </div>
          )}

          {result.ai_platforms && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 12
            }}>
              {Object.entries(result.ai_platforms).map(([platform, status]) => {
                const platformEmoji = {
                  chatgpt: '💬',
                  claude: '🤖',
                  perplexity: '🔍',
                  gemini: '💎'
                }[platform] || '🤖';

                const statusColor = {
                  excellent: '#047857',
                  good: '#3b82f6',
                  medium: '#f59e0b',
                  poor: '#ef4444'
                }[status] || '#9ca3af';

                return (
                  <div
                    key={platform}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: 'var(--bg-elev-1)',
                      border: 'var(--hairline)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{platformEmoji}</div>
                    <div style={{
                      fontSize: 11,
                      color: 'var(--text-dim)',
                      marginBottom: 4,
                      textTransform: 'capitalize'
                    }}>
                      {platform}
                    </div>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: statusColor,
                      textTransform: 'capitalize'
                    }}>
                      {status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export CSS for responsive behavior
export const geoAnalysisSectionStyles = `
  .geo-metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  @media (max-width: 720px) {
    .geo-metrics-grid {
      grid-template-columns: 1fr;
    }
  }

  .compact .geo-metrics-grid {
    grid-template-columns: 1fr !important;
  }
`;
