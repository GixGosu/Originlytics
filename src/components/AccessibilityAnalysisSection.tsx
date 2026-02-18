import { useState } from 'react';
import type { AccessibilityResult } from '../types/accessibility';

interface AccessibilityAnalysisSectionProps {
  result: AccessibilityResult | null;
  theme: string;
}

export function AccessibilityAnalysisSection({ result, theme }: AccessibilityAnalysisSectionProps) {
  const [expandedMetrics, setExpandedMetrics] = useState(false);
  const [expandedViolations, setExpandedViolations] = useState(false);

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
        <div style={{ fontSize: 48, marginBottom: 16 }}>♿</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
          No accessibility data available
        </div>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          Analyze a URL to see WCAG compliance
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return theme === 'dark' ? '#4ade80' : '#22c55e';
    if (score >= 70) return theme === 'dark' ? '#fbbf24' : '#f59e0b';
    return theme === 'dark' ? '#f87171' : '#ef4444';
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return theme === 'dark' ? '#4ade80' : '#22c55e';
    if (grade.startsWith('B')) return theme === 'dark' ? '#fbbf24' : '#f59e0b';
    return theme === 'dark' ? '#f87171' : '#ef4444';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#fbbf24';
      default: return '#94a3b8';
    }
  };

  const metricEntries = result.scores ? Object.entries(result.scores).sort((a, b) => b[1] - a[1]) : [];
  const visibleMetrics = expandedMetrics ? metricEntries : metricEntries.slice(0, 5);
  const visibleViolations = expandedViolations ? result.wcag_compliance.violations : result.wcag_compliance.violations.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overall Score Card */}
      <div className="card" style={{
        border: 'var(--hairline)',
        borderRadius: 16,
        padding: 24,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Score Gauge */}
          <div style={{ position: 'relative', width: 120, height: 120 }}>
            <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={getScoreColor(result.overall_accessibility_score)}
                strokeWidth="8"
                strokeDasharray={`${(result.overall_accessibility_score / 100) * 327} 327`}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(result.overall_accessibility_score) }}>
                {result.overall_accessibility_score}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: -4 }}>
                / 100
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Accessibility Score
              </h2>
              <span style={{
                fontSize: 20,
                fontWeight: 700,
                color: getGradeColor(result.grade),
                padding: '4px 12px',
                borderRadius: 8,
                background: `${getGradeColor(result.grade)}15`
              }}>
                {result.grade}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              {result.summary}
            </p>

            {/* WCAG Compliance Badges */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {['A', 'AA', 'AAA'].map((level) => {
                const key = `level_${level.toLowerCase()}` as keyof typeof result.wcag_compliance;
                const compliant = result.wcag_compliance[key];
                return (
                  <span
                    key={level}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: compliant ? '#22c55e20' : '#94a3b820',
                      color: compliant ? '#22c55e' : '#94a3b8'
                    }}
                  >
                    {compliant ? '✓' : '✗'} WCAG {level}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24
      }}>
        {/* Metrics Breakdown */}
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Accessibility Metrics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleMetrics.map(([metric, score]) => (
              <div key={metric}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{metric}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(score) }}>{score}%</span>
                </div>
                <div style={{
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${score}%`,
                    background: getScoreColor(score),
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {metricEntries.length > 5 && (
            <button
              onClick={() => setExpandedMetrics(!expandedMetrics)}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                background: 'var(--hover)',
                border: 'var(--hairline)',
                borderRadius: 8,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {expandedMetrics ? 'Show Less' : `Show All ${metricEntries.length} Metrics`}
            </button>
          )}
        </div>

        {/* Recommendations */}
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Recommendations ({result.recommendations.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.recommendations.slice(0, 10).map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: 'var(--hover)',
                  borderRadius: 8,
                  borderLeft: `3px solid ${getPriorityColor(rec.priority)}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: getPriorityColor(rec.priority)
                  }}>
                    {rec.priority}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4, textAlign: 'left' }}>
                  {rec.text}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, textAlign: 'left' }}>
                  {rec.details}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WCAG Violations */}
      {result.wcag_compliance.violations.length > 0 && (
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            WCAG Violations ({result.metadata.total_violations})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleViolations.map((violation, idx) => (
              <details key={idx} style={{
                padding: 12,
                background: 'var(--hover)',
                borderRadius: 8,
                borderLeft: `3px solid ${violation.impact === 'critical' || violation.impact === 'serious' ? '#ef4444' : '#f59e0b'}`
              }}>
                <summary style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: violation.impact === 'critical' || violation.impact === 'serious' ? '#ef4444' : '#f59e0b',
                    marginRight: 8
                  }}>
                    {violation.impact}
                  </span>
                  {violation.description} ({violation.nodes_affected} elements)
                </summary>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12, textAlign: 'left' }}>
                    <strong>How to fix:</strong> {violation.help}
                  </div>

                  {/* List of all affected nodes */}
                  {violation.affected_nodes && violation.affected_nodes.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 8, textAlign: 'left' }}>
                        Affected Elements ({violation.affected_nodes.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {violation.affected_nodes.map((node, nodeIdx) => (
                          <details key={nodeIdx} style={{
                            padding: 8,
                            background: 'var(--card)',
                            borderRadius: 4,
                            border: '1px solid var(--border)'
                          }}>
                            <summary style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: 'var(--text)',
                              cursor: 'pointer',
                              userSelect: 'none',
                              textAlign: 'left'
                            }}>
                              Element {nodeIdx + 1}: {node.target || 'Unknown selector'}
                            </summary>
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                              {node.failure_summary && (
                                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 6, textAlign: 'left' }}>
                                  <strong>Issue:</strong> {node.failure_summary}
                                </div>
                              )}
                              {node.html && (
                                <>
                                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4, textAlign: 'left' }}>
                                    <strong>HTML:</strong>
                                  </div>
                                  <pre style={{
                                    fontSize: 10,
                                    padding: 6,
                                    background: 'var(--bg)',
                                    borderRadius: 4,
                                    overflow: 'auto',
                                    color: 'var(--text-dim)',
                                    margin: 0
                                  }}>
                                    {node.html}
                                  </pre>
                                </>
                              )}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}

                  <a
                    href={violation.help_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
                      textDecoration: 'none'
                    }}
                  >
                    Learn more →
                  </a>
                </div>
              </details>
            ))}
          </div>

          {result.wcag_compliance.violations.length > 5 && (
            <button
              onClick={() => setExpandedViolations(!expandedViolations)}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                background: 'var(--hover)',
                border: 'var(--hairline)',
                borderRadius: 8,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {expandedViolations ? 'Show Less' : `Show All ${result.wcag_compliance.violations.length} Violations`}
            </button>
          )}
        </div>
      )}

      {/* Metadata Footer */}
      <div style={{
        fontSize: 11,
        color: 'var(--text-dim)',
        textAlign: 'center',
        padding: 12
      }}>
        Tested with {result.metadata.tool} • {result.metadata.total_passes} checks passed • {result.metadata.total_violations} violations found
      </div>
    </div>
  );
}
