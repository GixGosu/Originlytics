import { useState } from 'react';
import type { GeoRecommendation, GeoRecommendationPriority } from '../types/geo';

interface GeoRecommendationsProps {
  recommendations: GeoRecommendation[];
}

interface GeoRecommendationGroupProps {
  priority: GeoRecommendationPriority;
  label: string;
  icon: string;
  color: string;
  items: GeoRecommendation[];
}

function GeoRecommendationGroup({
  priority,
  label,
  icon,
  color,
  items
}: GeoRecommendationGroupProps) {
  const [expanded, setExpanded] = useState(priority === 'critical');

  return (
    <div style={{
      border: 'var(--hairline)',
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'var(--bg-elev-1)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 600,
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-elev-2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-elev-1)'}
        aria-expanded={expanded}
        aria-controls={`geo-recommendations-${priority}`}
        aria-label={`${label} priority GEO recommendations: ${items.length} items`}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span>{label}</span>
          <span style={{
            fontSize: 11,
            padding: '2px 6px',
            background: `${color}20`,
            color: color,
            borderRadius: 999,
            fontWeight: 700
          }}>
            {items.length}
          </span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Items list */}
      {expanded && (
        <div
          id={`geo-recommendations-${priority}`}
          style={{
            padding: 12,
            background: 'var(--card)'
          }}
        >
          <ul style={{
            margin: 0,
            padding: '0 0 0 20px',
            listStyle: 'disc',
            color: 'var(--text)'
          }}>
            {items.map((item, idx) => (
              <li
                key={idx}
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--text)'
                }}
              >
                {item.text}
                {item.details && (
                  <span style={{
                    display: 'block',
                    fontSize: 12,
                    color: 'var(--text-dim)',
                    marginTop: 4,
                    fontStyle: 'italic',
                    textAlign: 'left'
                  }}>
                    {item.details}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function GeoRecommendations({ recommendations }: GeoRecommendationsProps) {
  // Group by priority
  const grouped = recommendations.reduce((acc, rec) => {
    acc[rec.priority] = acc[rec.priority] || [];
    acc[rec.priority].push(rec);
    return acc;
  }, {} as Record<string, GeoRecommendation[]>);

  const priorities: Array<{
    key: GeoRecommendationPriority;
    label: string;
    icon: string;
    color: string;
  }> = [
    { key: 'critical', label: 'CRITICAL', icon: '🔴', color: '#ef4444' },
    { key: 'high', label: 'HIGH', icon: '🟠', color: '#f59e0b' },
    { key: 'medium', label: 'MEDIUM', icon: '🟡', color: '#eab308' },
    { key: 'low', label: 'LOW', icon: '🟢', color: '#22c55e' }
  ];

  return (
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
        <span>💡</span>
        GEO Recommendations
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {priorities.map(({ key, label, icon, color }) => {
          const items = grouped[key] || [];
          if (items.length === 0) return null;

          return (
            <GeoRecommendationGroup
              key={key}
              priority={key}
              label={label}
              icon={icon}
              color={color}
              items={items}
            />
          );
        })}
      </div>

      {recommendations.length === 0 && (
        <div style={{
          textAlign: 'center',
          color: 'var(--text-dim)',
          padding: 24,
          fontSize: 14
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 600, color: '#8b5cf6', marginBottom: 4 }}>
            Excellent GEO Optimization!
          </div>
          <div>
            Your content is well-optimized for AI platform citations
          </div>
        </div>
      )}
    </div>
  );
}
