import logoLight from './assets/High-Resolution-Color-Logo-on-Transparent-Background.svg';
import logoDark from './assets/High-Resolution-Color-Logo-on-Transparent-Background-DARK.svg';
import './App.css';

// v1.1 - Fixed undefined scores handling
import React, { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Import new components
import { CreditBadge, creditBadgeStyles } from './components/CreditBadge';
import { PricingPage, pricingPageStyles } from './components/PricingPage';
import { packageCardStyles } from './components/PackageCard';
import { PurchaseModal, purchaseModalStyles } from './components/PurchaseModal';
import { MetricBadge, metricBadgeStyles } from './components/MetricBadge';
import { AuthModal, authModalStyles } from './components/AuthModal';
import { TierBadge, PremiumFeatureBadge, tierBadgeStyles } from './components/TierBadge';
import { SimpleResult, simpleResultStyles } from './components/SimpleResult';
import { ViewModeToggle, viewModeToggleStyles } from './components/ViewModeToggle';

// Lazy load SEO and GEO components (code splitting for performance)
const SeoAnalysisSection = lazy(() => import('./components/SeoAnalysisSection').then(module => ({ default: module.SeoAnalysisSection })));
const GeoAnalysisSection = lazy(() => import('./components/GeoAnalysisSection').then(module => ({ default: module.GeoAnalysisSection })));
const AccessibilityAnalysisSection = lazy(() => import('./components/AccessibilityAnalysisSection').then(module => ({ default: module.AccessibilityAnalysisSection })));
const EmotionalAnalysisSection = lazy(() => import('./components/EmotionalAnalysisSection').then(module => ({ default: module.EmotionalAnalysisSection })));
const ModelAnalysisSection = lazy(() => import('./components/ModelAnalysisSection').then(module => ({ default: module.ModelAnalysisSection })));

// Import design tokens
import { DesignTokens } from './styles/DesignTokens';

// Import metric descriptions and configuration
import { METRIC_DESCRIPTIONS, invertedMetrics } from './data/metricDescriptions';

// Import SEO, GEO, Accessibility, and Emotional types
import type { SeoResult } from './types/seo';
import type { GeoResult } from './types/geo';
import type { AccessibilityResult } from './types/accessibility';
import type { EmotionalAnalysis } from './types/emotional';

// Import theme hook
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Type definitions
interface LikelihoodScore {
  percent: number;
  na: boolean;
  reason?: string;
  calculationMethod?: 'statistical' | 'ai_estimated';
}

interface LikelihoodData {
  scores: Record<string, LikelihoodScore>;
  overall?: number; // Now optional, calculated on frontend
  notes?: string;
  roberta_score?: number; // Individual RoBERTa score
  binoculars_score?: number; // Individual Binoculars score
  model?: string; // Model used (e.g., 'combined:roberta+binoculars')
  ensembleScore?: any; // Ensemble score calculation results
  individual_results?: any; // Individual model results for debugging
}

interface AnalysisResult {
  summary: string;
  keyPoints: string;
  toxicityScore: number;
  aiLikelihood: LikelihoodData; // Changed from likelihood to aiLikelihood
  tier?: 'free' | 'paid'; // Add tier information
  upgradeMessage?: string; // Upgrade prompt for free tier
  premiumMetrics?: any; // Premium metrics data
  seo?: SeoResult; // SEO analysis results
  geo?: GeoResult; // GEO analysis results
  accessibility?: AccessibilityResult; // Accessibility analysis results
  emotional?: EmotionalAnalysis | null; // Emotional analysis results
}

interface AnalyticsRow {
  category: string;
  score: number | null;
  na: boolean;
  reason: string;
  calculationMethod?: 'statistical' | 'ai_estimated';
}

interface ControlsProps {
  query: string;
  setQuery: (query: string) => void;
  minScore: number;
  setMinScore: (score: number) => void;
  sortKey: string;
  setSortKey: (key: string) => void;
  sortDir: 'asc' | 'desc';
  setSortDir: (dir: 'asc' | 'desc') => void;
  onExport: () => void;
}

interface FilterOptions {
  query: string;
  minScore: number;
  sortKey: string;
  sortDir: 'asc' | 'desc';
}

// ---------------------- Helper utils ----------------------
function normScore(input: number | string | { value?: number; percent?: number; score?: number } | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === 'number' && isFinite(input)) return Math.max(0, Math.min(100, input));
  if (typeof input === 'string') {
    const n = parseInt(input.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }
  if (typeof input === 'object') {
    if ('value' in input && input.value !== undefined) return normScore(input.value);
    if ('percent' in input && input.percent !== undefined) return normScore(input.percent);
    if ('score' in input && input.score !== undefined) return normScore(input.score);
  }
  return 0;
}
const pct = (s: number | string | { value?: number; percent?: number; score?: number } | null | undefined) => normScore(s);

const scoreToTier = (v: number, isDark: boolean = false) => {
  if (v >= 75) return { 
    label: "Likely AI", 
    bg: isDark ? "#451a1a" : "#fee2e2", 
    fg: isDark ? "#fca5a5" : "#b91c1c", 
    bar: isDark ? "#f87171" : "#ef4444" 
  };
  if (v >= 50) return { 
    label: "Possibly AI", 
    bg: isDark ? "#451a03" : "#fffbeb", 
    fg: isDark ? "#fcd34d" : "#b45309", 
    bar: isDark ? "#fbbf24" : "#f59e0b" 
  };
  if (v >= 25) return { 
    label: "Uncertain", 
    bg: isDark ? "#422006" : "#fefce8", 
    fg: isDark ? "#fde047" : "#a16207", 
    bar: isDark ? "#facc15" : "#eab308" 
  };
  return {
    label: "Likely Human",
    bg: isDark ? "#14532d" : "#ecfdf5",
    fg: isDark ? "#86efac" : "#047857",
    bar: isDark ? "#4ade80" : "#22c55e"
  };
};

// CSV helpers
function csvEscape(val: string | number | null | undefined) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function rowsToCSV(rows: AnalyticsRow[]) {
  const header = ["Category", "Score"].map(csvEscape).join(",");
  const body = rows.map((r) => [r.category, pct(r.score)].map(csvEscape).join(",")).join("\n");
  return header + "\n" + body;
}
function downloadCSV(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------- UI primitives ----------------------
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

// ---------------------- UI primitives ----------------------
function Badge({ value, style, theme }: { value: number, style?: React.CSSProperties, theme?: string }) {
  const tier = scoreToTier(value, theme === 'dark');
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

function GaugeRing({ value = 0, size = 56, stroke = 8, track = "var(--track)", color, theme }: { value?: number, size?: number, stroke?: number, track?: string, color?: string, theme?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = c - (v / 100) * c;
  const tier = scoreToTier(v, theme === 'dark');
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

function MetricRow({ category, score, na, reason, theme, calculationMethod }: { category: string, score: number | null, na: boolean, reason: string, theme: string, calculationMethod?: 'statistical' | 'ai_estimated' }) {
  // Check if this metric is inverted (higher = better/more human)
  const isInverted = invertedMetrics.has(category);

  // Show the REAL percentage value, don't invert for display
  const value = pct(score);

  // For inverted metrics, we need to invert the value for BOTH color and label
  // so that high values show as "Likely Human" with green colors
  const displayValue = isInverted ? (100 - value) : value;
  const tier = scoreToTier(displayValue, theme === 'dark');

  const [showDetails, setShowDetails] = useState(false);
  const description = METRIC_DESCRIPTIONS[category];

  return (
    <div
      className="metric-row"
      style={{
        border: "var(--hairline)",
        borderRadius: 16,
        padding: 16,
        background: "var(--card)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "grid",
        gridTemplateColumns: "56px 1fr auto",
        gap: 12,
        alignItems: "center",
      }}
    >
      <GaugeRing value={na ? 0 : value} theme={theme} color={tier.bar} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            {category}
            {calculationMethod && (
              <MetricBadge method={calculationMethod} compact />
            )}
            {isInverted && (
              <span
                style={{
                  color: "#22c55e",
                  fontSize: 10,
                  fontWeight: "bold",
                  background: "#ecfdf5",
                  padding: "2px 4px",
                  borderRadius: 4,
                  border: "1px solid #22c55e"
                }}
                title="Higher values indicate lower AI likelihood"
              >
                ↑
              </span>
            )}
            {description && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 2,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Click for details"
              >
                ℹ️
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {na ? 'N/A' : <CountUp value={value} suffix="%" />}
          </div>
        </div>

        {showDetails && description && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: "var(--bg-elev-1)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--text-dim)"
          }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Description:</strong> {description.description}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Interpretation:</strong> {description.interpretation}
            </div>
            {reason && (
              <div>
                <strong>Reason:</strong> {reason}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 10, height: 8, width: "100%", background: "var(--track)", borderRadius: 999 }}>
          <div
            style={{
              width: na ? '0%' : `${value}%`,
              height: 8,
              background: na ? 'gray' : tier.bar,
              borderRadius: 999,
              transition: "width 500ms ease",
            }}
            title={na ? reason : `${value}%`}
          />
        </div>
        <div style={{ marginTop: 8 }}>
          {na ? <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{reason}</span> : <Badge value={displayValue} theme={theme} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------- Controls (sorting & filtering) ----------------------
function Controls({ query, setQuery, minScore, setMinScore, sortKey, setSortKey, sortDir, setSortDir, onExport }: ControlsProps) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--card)", borderRadius: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", padding: 12 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 140px 140px 120px",
        gap: 8,
        alignItems: "center",
      }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by category…"
          style={{ padding: 8, borderRadius: 10, border: "var(--hairline)" }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Min %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ width: 70, padding: 8, borderRadius: 10, border: "var(--hairline)" }}
          />
        </div>

        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ padding: 8, borderRadius: 10, border: "var(--hairline)" }}>
          <option value="score">Sort: Score</option>
          <option value="category">Sort: Category</option>
        </select>

        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')} style={{ padding: 8, borderRadius: 10, border: "var(--hairline)" }}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>

        <button
          onClick={onExport}
          style={{ padding: 8, borderRadius: 10, border: "var(--hairline)", background: "#0f172a", color: "#e5e7eb", cursor: "pointer" }}
          title="Export filtered metrics to CSV"
        >
          Save CSV
        </button>
      </div>
    </div>
  );
}

function useFilteredSortedMetrics(data: AnalyticsRow[], { query, minScore, sortKey, sortDir }: FilterOptions) {
  return useMemo(() => {
    let rows = Array.isArray(data) ? [...data] : [];

    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => r.category.toLowerCase().includes(q));
    }

    if (typeof minScore === "number") {
      rows = rows.filter((r) => pct(r.score) >= (minScore || 0));
    }

    rows.sort((a, b) => {
      if (sortKey === "category") {
        return sortDir === "asc"
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      // default score sort
      return sortDir === "asc" ? pct(a.score) - pct(b.score) : pct(b.score) - pct(a.score);
    });

    return rows;
  }, [data, query, minScore, sortKey, sortDir]);
}

function AnalyticsPanel({ analyticsData, result, theme }: { analyticsData: AnalyticsRow[], result: AnalysisResult | null, theme: string }) {
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>("desc");

  const filtered = useFilteredSortedMetrics(analyticsData, { query, minScore, sortKey, sortDir });

  // Split metrics into AI indicators (higher = more AI) and Human indicators (higher = more human)
  const aiIndicators = useMemo(() =>
    filtered.filter(d => !invertedMetrics.has(d.category)),
    [filtered]
  );

  const humanIndicators = useMemo(() =>
    filtered.filter(d => invertedMetrics.has(d.category)),
    [filtered]
  );

  const handleExport = () => {
    const csv = rowsToCSV(filtered);
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
    const filename = `metrics-${stamp}.csv`;
    downloadCSV(filename, csv);
  };

  // Prepare chart data - split into two separate charts
  const { higherChartData, lowerChartData } = useMemo(() => {
    const availableMetrics = analyticsData.filter(row => !row.na && row.score !== null);

    // Separate metrics by interpretation
    const higherIsMoreAI = availableMetrics.filter(row => !invertedMetrics.has(row.category));
    const lowerIsMoreAI = availableMetrics.filter(row => invertedMetrics.has(row.category));

    const createDataset = (metrics: typeof availableMetrics, isInverted: boolean) => ({
      labels: metrics.map(row => row.category),
      datasets: [{
        label: '',
        data: metrics.map(row => pct(row.score)),
        backgroundColor: metrics.map(row => {
          const score = pct(row.score);
          // For inverted metrics, invert the score for color calculation
          const colorScore = isInverted ? (100 - score) : score;
          const tier = scoreToTier(colorScore, theme === 'dark');
          return tier.bar;
        }),
        borderColor: metrics.map(row => {
          const score = pct(row.score);
          // For inverted metrics, invert the score for color calculation
          const colorScore = isInverted ? (100 - score) : score;
          const tier = scoreToTier(colorScore, theme === 'dark');
          return tier.fg;
        }),
        borderWidth: 1,
      }],
    });

    return {
      higherChartData: createDataset(higherIsMoreAI, false),
      lowerChartData: createDataset(lowerIsMoreAI, true),
    };
  }, [analyticsData, theme]);

  const createChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        color: theme === 'dark' ? '#f1f5f9' : '#0b1325',
        font: {
          size: 15,
          weight: 'bold' as const,
        },
        padding: {
          bottom: 10
        }
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#0f1522' : '#ffffff',
        titleColor: theme === 'dark' ? '#f1f5f9' : '#0b1325',
        bodyColor: theme === 'dark' ? '#f1f5f9' : '#0b1325',
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,40,.08)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const metricName = context.label;
            const displayScore = context.parsed.y;
            return `${metricName}: ${displayScore}%`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: theme === 'dark' ? '#9fb0d9' : '#4b5875',
          callback: function(value: number | string) {
            return value + '%';
          },
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,40,.08)',
        },
      },
      x: {
        ticks: {
          color: theme === 'dark' ? '#9fb0d9' : '#4b5875',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,40,.08)',
        },
      },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* First chart: Higher Score = More AI Likely */}
      <div style={{
        border: "var(--hairline)",
        borderRadius: 16,
        padding: 20,
        background: "var(--card)",
        boxShadow: "var(--shadow-1)"
      }}>
        <div style={{
          padding: "12px 16px",
          background: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
          borderRadius: 8,
          border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
          marginBottom: 16
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme === 'dark' ? '#fca5a5' : '#dc2626',
            marginBottom: 6,
            textAlign: "center"
          }}>
            Higher Score = More AI Likely ↑
          </div>
          <div style={{
            fontSize: 12,
            color: theme === 'dark' ? '#9fb0d9' : '#64748b',
            lineHeight: 1.5
          }}>
            These metrics increase when AI generation is detected. Higher values indicate stronger signals of AI-generated content.
          </div>
        </div>
        
        <div style={{ height: 350 }}>
          <Bar data={higherChartData} options={createChartOptions('Statistical & Pattern Detection Metrics')} />
        </div>
      </div>

      {/* Second chart: Lower Score = More AI Likely */}
      {lowerChartData.datasets[0]?.data.length > 0 ? (
        <div style={{
          border: "var(--hairline)",
          borderRadius: 16,
          padding: 20,
          background: "var(--card)",
          boxShadow: "var(--shadow-1)"
        }}>
          <div style={{
            padding: "12px 16px",
            background: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
            borderRadius: 8,
            border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`,
            marginBottom: 16
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: theme === 'dark' ? '#86efac' : '#16a34a',
              marginBottom: 6,
              textAlign: "center"
            }}>
              Lower Score = More AI Likely ↓
            </div>
            <div style={{
              fontSize: 12,
              color: theme === 'dark' ? '#9fb0d9' : '#64748b',
              lineHeight: 1.5
            }}>
              These metrics decrease when AI generation is detected. Lower values indicate stronger signals of AI-generated content, while higher values suggest human writing.
            </div>
          </div>
          
          <div style={{ height: 350 }}>
            <Bar data={lowerChartData} options={createChartOptions('Coherence & Consistency Metrics')} />
          </div>
        </div>
      ) : (
        <div style={{
          border: "var(--hairline)",
          borderRadius: 16,
          padding: 32,
          background: "var(--card)",
          boxShadow: "var(--shadow-1)",
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--text)",
            marginBottom: 12
          }}>
            🔒 Coherence & Consistency Metrics
          </div>
          <div style={{
            fontSize: 14,
            color: "var(--text-dim)",
            marginBottom: 20,
            lineHeight: 1.6
          }}>
            Advanced coherence metrics (Coreference, Semantic Consistency, Temporal Consistency, etc.) are available in the paid tier.
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            View Pricing
          </button>
        </div>
      )}

      {/* Analytics section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Ensemble Score Section */}
        {result?.aiLikelihood?.ensembleScore && (
          <div style={{
            border: "var(--hairline)",
            borderRadius: 16,
            padding: 20,
            background: "var(--card)",
            boxShadow: "var(--shadow-1)"
          }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                🎯 Ensemble Detection Score
                <span style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: "var(--text-dim)",
                  background: "var(--bg-elev-1)",
                  padding: "2px 8px",
                  borderRadius: 4
                }}>
                  {result.aiLikelihood.ensembleScore.metrics_used} metrics combined
                </span>
                {result.tier === 'paid' && result.aiLikelihood.ensembleScore.premium_enhancement && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#3b82f6",
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
                    padding: "2px 6px",
                    borderRadius: 4,
                    border: "1px solid rgba(59, 130, 246, 0.3)"
                  }}>
                    +{result.aiLikelihood.ensembleScore.premium_enhancement.metrics_added} PREMIUM
                  </span>
                )}
              </h4>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                {result.tier === 'paid' && result.aiLikelihood.ensembleScore.premium_enhancement ? (
                  <>Combines advanced AI models (RoBERTa transformer, Binoculars perplexity) with statistical patterns, linguistic markers, and premium NLP metrics (lexical diversity, readability, POS ratios) for maximum accuracy</>
                ) : (
                  <>Combines advanced AI models (RoBERTa transformer, Binoculars perplexity) with statistical patterns (burstiness, n-gram entropy) and AI-estimated linguistic markers (semantic consistency, common AI patterns)</>
                )}
              </div>
            </div>

            {/* Main Ensemble Score */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <GaugeRing value={result.aiLikelihood.ensembleScore.overall_score} size={80} stroke={10} theme={theme} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: "var(--text)" }}>
                  {result.aiLikelihood.ensembleScore.overall_score}%
                </div>
                <div style={{ fontSize: 14, color: "var(--text)", marginTop: 4 }}>
                  {result.aiLikelihood.ensembleScore.interpretation}
                </div>
                <div style={{
                  fontSize: 12,
                  color: "var(--text-dim)",
                  marginTop: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}>
                  <div style={{
                    width: `${result.aiLikelihood.ensembleScore.confidence}%`,
                    height: 4,
                    background: result.aiLikelihood.ensembleScore.confidence >= 70 ? "#22c55e" : result.aiLikelihood.ensembleScore.confidence >= 50 ? "#fbbf24" : "#f87171",
                    borderRadius: 2,
                    maxWidth: 100
                  }} />
                  <span>Confidence: {result.aiLikelihood.ensembleScore.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Key Indicators */}
            {result.aiLikelihood.ensembleScore.key_indicators && result.aiLikelihood.ensembleScore.key_indicators.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
                  🔑 Key Indicators:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {result.aiLikelihood.ensembleScore.key_indicators.map((indicator: string, idx: number) => (
                    <div key={idx} style={{
                      fontSize: 12,
                      color: "var(--text-dim)",
                      padding: "6px 10px",
                      background: "var(--bg-elev-1)",
                      borderRadius: 6,
                      border: "1px solid var(--hairline)"
                    }}>
                      • {indicator}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Group Scores */}
            {result.aiLikelihood.ensembleScore.ensemble_details && Object.keys(result.aiLikelihood.ensembleScore.ensemble_details).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 12 }}>
                  📊 Metric Group Breakdown:
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 10
                }}>
                  {Object.entries(result.aiLikelihood.ensembleScore.ensemble_details).map(([group, score]: [string, any]) => {
                    const groupScore = typeof score === 'number' ? score : 50;
                    const tier = scoreToTier(groupScore, theme === 'dark');
                    return (
                      <div key={group} style={{
                        padding: 10,
                        background: "var(--bg-elev-1)",
                        borderRadius: 8,
                        border: `1px solid ${tier.fg}40`,
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4, textTransform: "capitalize" }}>
                          {group.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: tier.fg }}>
                          {groupScore}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Premium Enhancement Badge */}
            {result.aiLikelihood.ensembleScore.premium_enhancement && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))",
                borderRadius: 8,
                border: "1px solid rgba(59, 130, 246, 0.3)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>
                    Premium Enhanced Ensemble
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  Using {result.aiLikelihood.ensembleScore.premium_enhancement.enhanced_metrics_count} metrics
                  (added {result.aiLikelihood.ensembleScore.premium_enhancement.metrics_added} premium metrics:
                  lexical diversity, linguistic ratios, advanced readability)
                  {result.aiLikelihood.ensembleScore.premium_enhancement.score_change !== 0 && (
                    <span style={{
                      marginLeft: 8,
                      color: Math.abs(result.aiLikelihood.ensembleScore.premium_enhancement.score_change) > 5 ? "#f59e0b" : "var(--text-dim)"
                    }}>
                      • Score adjusted {result.aiLikelihood.ensembleScore.premium_enhancement.score_change > 0 ? '+' : ''}{result.aiLikelihood.ensembleScore.premium_enhancement.score_change}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Agreement Analysis */}
            {result.aiLikelihood.ensembleScore.agreement_analysis && (
              <div style={{
                marginTop: 16,
                padding: 12,
                background: result.aiLikelihood.ensembleScore.agreement_analysis.status === 'confident' ? "rgba(34, 197, 94, 0.1)" :
                           result.aiLikelihood.ensembleScore.agreement_analysis.status === 'uncertain' ? "rgba(239, 68, 68, 0.1)" :
                           "rgba(251, 191, 36, 0.1)",
                borderRadius: 8,
                border: `1px solid ${
                  result.aiLikelihood.ensembleScore.agreement_analysis.status === 'confident' ? "#22c55e40" :
                  result.aiLikelihood.ensembleScore.agreement_analysis.status === 'uncertain' ? "#ef444440" :
                  "#fbbf2440"
                }`
              }}>
                <div style={{ fontSize: 12, color: "var(--text)" }}>
                  <strong>Analysis Status:</strong> {result.aiLikelihood.ensembleScore.agreement_analysis.message}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Model Analysis (RoBERTa + Binoculars) */}
        {(() => {
          // Debug logging
          console.log('[ModelAnalysis] aiLikelihood:', result?.aiLikelihood);
          console.log('[ModelAnalysis] individual_results:', result?.aiLikelihood?.individual_results);
          console.log('[ModelAnalysis] roberta_score:', result?.aiLikelihood?.roberta_score);
          console.log('[ModelAnalysis] binoculars_score:', result?.aiLikelihood?.binoculars_score);
          console.log('[ModelAnalysis] model:', result?.aiLikelihood?.model);

          return result?.aiLikelihood?.individual_results && result.tier === 'paid' ? (
            <Suspense fallback={<div />}>
              <ModelAnalysisSection
                individualResults={result.aiLikelihood.individual_results}
                theme={theme}
              />
            </Suspense>
          ) : (
            /* Show upgrade prompt for advanced model analysis on free tier */
            result?.aiLikelihood && result.tier !== 'paid' && (
            <div style={{
              marginTop: 24,
              padding: 32,
              border: 'var(--hairline)',
              borderRadius: 16,
              background: 'var(--card)',
              boxShadow: 'var(--shadow-1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
                🔬 Advanced Model Analysis
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 20, lineHeight: 1.6 }}>
                Deep learning models (RoBERTa and Binoculars) with chunk-by-chunk analysis are available in the paid tier.
                <br /><br />
                Current detection: <code style={{
                  background: 'var(--hover)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 12
                }}>statistical heuristics</code>
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
              >
                View Pricing
              </button>
            </div>
            )
          );
        })()}

        {/* Controls + all metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ border: "var(--hairline)", borderRadius: 16, background: "var(--card)" }}>
            <Controls
              query={query}
              setQuery={setQuery}
              minScore={minScore}
              setMinScore={setMinScore}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              onExport={handleExport}
            />
            <div style={{ fontSize: 12, color: "var(--text-dim)", padding: "0 12px 12px" }}>
              Showing {filtered.length} of {(analyticsData || []).length} metrics ({aiIndicators.length} AI indicators, {humanIndicators.length} human indicators)
            </div>
          </div>

          {/* AI Indicators Section (Higher = More AI Likely) */}
          {aiIndicators.length > 0 && (
            <>
              <div style={{
                padding: "12px 16px",
                background: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                borderRadius: 12,
                border: `1px solid ${theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme === 'dark' ? '#fca5a5' : '#dc2626',
                  marginBottom: 4
                }}>
                  🤖 AI Indicators ({aiIndicators.length})
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  lineHeight: 1.5
                }}>
                  Higher scores indicate stronger AI detection signals
                </div>
              </div>
              {aiIndicators.map((d) => (
                <MetricRow key={d.category} category={d.category} score={d.score} na={d.na} reason={d.reason} theme={theme} calculationMethod={d.calculationMethod} />
              ))}
            </>
          )}

          {/* Human Indicators Section (Higher = More Human Likely) */}
          {humanIndicators.length > 0 && (
            <>
              <div style={{
                padding: "12px 16px",
                background: theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                borderRadius: 12,
                border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`,
                marginTop: aiIndicators.length > 0 ? 24 : 0
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme === 'dark' ? '#86efac' : '#16a34a',
                  marginBottom: 4
                }}>
                  👤 Human Indicators ({humanIndicators.length})
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-dim)',
                  lineHeight: 1.5
                }}>
                  Higher scores indicate stronger human writing signals
                </div>
              </div>
              {humanIndicators.map((d) => (
                <MetricRow key={d.category} category={d.category} score={d.score} na={d.na} reason={d.reason} theme={theme} calculationMethod={d.calculationMethod} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------- Main App (integrated) ----------------------

// Helper to get API base URL (production vs development)
const getApiUrl = () => {
  // In production, API is on same domain, use relative path
  if (window.location.hostname !== 'localhost') {
    return window.location.origin; // Uses current domain (https://www.originlytics.com)
  }
  return 'http://localhost:5002';
};

function App() {
  const [url, setUrl] = useState("");
  const [inputMode, setInputMode] = useState<'url' | 'text'>('text');
  const [textContent, setTextContent] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);

  // Theme management with useTheme hook
  const { effectiveTheme } = useTheme();
  const theme = effectiveTheme; // For backwards compatibility
  
  // Force logo refresh when theme changes
  useEffect(() => {
    if (logoRef.current) {
      logoRef.current.src = effectiveTheme === 'dark' ? logoDark : logoLight;
    }
  }, [effectiveTheme, logoDark, logoLight]);
  
  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ui.compact') === '1';
    }
    return false;
  });

  // View mode: simple (for casual users) or advanced (for power users)
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ui.viewMode');
      return saved === 'advanced' ? 'advanced' : 'simple';
    }
    return 'simple';
  });

  // Auth and credits state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [purchaseModal, setPurchaseModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'loading' | 'error' | 'success';
  }>({ isOpen: false, message: '', type: 'loading' });
  const [usePremium, setUsePremium] = useState(false);

  // Tab state for SEO | GEO | Accessibility | Emotional | Combined view
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'seo' | 'geo' | 'accessibility' | 'emotional' | 'combined'>('seo');

  // Theme useEffect removed - now handled by useTheme hook

  useEffect(() => {
    try { localStorage.setItem('ui.compact', compactMode ? '1' : '0'); } catch {} // eslint-disable-line no-empty
  }, [compactMode]);

  useEffect(() => {
    try { localStorage.setItem('ui.viewMode', viewMode); } catch {} // eslint-disable-line no-empty
  }, [viewMode]);

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 420);
    return () => clearTimeout(t);
  }, []);
  
  // Check auth status and load balance
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Fetch balance
          const balanceRes = await fetch(`${getApiUrl()}/api/tokens/balance`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (balanceRes.ok) {
            const data = await balanceRes.json();
            setCreditBalance(data.balance);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('auth_token');
          }
        } catch (err) {
          console.error('Auth check failed:', err);
        }
      }
    };
    checkAuth();
  }, []);
  
  // Load packages
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/stripe/packages`);
        if (res.ok) {
          const data = await res.json();
          setPackages(data.packages);
        }
      } catch (err) {
        console.error('Failed to load packages:', err);
      }
    };
    loadPackages();
  }, []);
  
  // Handle purchase flow
  const handleBuyCredits = () => {
    setShowPricing(true);
  };
  
  const handleSelectPackage = async (packageId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setPurchaseModal({
        isOpen: true,
        message: 'Please sign in to purchase credits',
        type: 'error'
      });
      return;
    }
    
    setPurchaseModal({
      isOpen: true,
      message: 'Creating checkout session...',
      type: 'loading'
    });
    
    try {
      const res = await fetch(`${getApiUrl()}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          packageId,
          successUrl: `${window.location.origin}/?purchase=success`,
          cancelUrl: `${window.location.origin}/?purchase=cancelled`
        })
      });
      
      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setPurchaseModal({
        isOpen: true,
        message: err instanceof Error ? err.message : 'Failed to start checkout',
        type: 'error'
      });
    }
  };
  
  const handleSignIn = () => {
    setShowAuthModal(true);
  };
  
  const handleAuthSuccess = async (token: string) => {
    try {
      // Fetch balance
      const balanceRes = await fetch(`${getApiUrl()}/api/tokens/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setCreditBalance(data.balance);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Failed to fetch balance after login:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    
    // Create abort controller with 4 minute timeout (model downloads on first use)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes
    
    try {
      const requestBody: any = inputMode === 'url' ? { url } : { text: textContent };
      const headers: any = { "Content-Type": "application/json" };
      
      // SECURITY: Send Authorization header for server-side verification
      // Never send userId in body - server will extract it from verified JWT
      if (isAuthenticated && usePremium && creditBalance && creditBalance > 0) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          requestBody.useAdvanced = true;
        }
      }
      
      const response = await fetch(`${getApiUrl()}/api/analyze`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorData = JSON.parse(errorText);
          // Check for word count error
          if (errorData.error === 'Content too short' || errorData.message?.includes('200 words')) {
            errorMessage = errorData.message || 'Please provide at least 200 words for accurate analysis.';
          } else {
            errorMessage = errorData.message || errorText;
          }
        } catch {
          // Use raw text if not JSON
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
        console.log('[DEBUG] API Response tier:', data.tier);
        console.log('[DEBUG] API Response keys:', Object.keys(data));
        console.log('[DEBUG] Emotional data from API:', data.emotional);
        setResult(data);
        
        // Refresh balance if authenticated and used premium
        if (isAuthenticated && usePremium) {
          const token = localStorage.getItem('auth_token');
          if (token) {
            const balanceRes = await fetch(`${getApiUrl()}/api/tokens/balance`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (balanceRes.ok) {
              const balanceData = await balanceRes.json();
              setCreditBalance(balanceData.balance);
            }
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        setError(err instanceof Error ? err.message : "Error occurred");
      } finally {
        setLoading(false);
      }
    };
  
    const analyticsData = useMemo(() => {
    const likelihood = result?.aiLikelihood; // Changed from result?.likelihood to result?.aiLikelihood
    if (!likelihood || !likelihood.scores) {
      return [
        { category: 'Perplexity', score: 10, na: false, reason: '' },
        { category: 'Burstiness', score: 5, na: false, reason: '' },
        { category: 'Common Patterns', score: 5, na: false, reason: '' },
        { category: 'Semantic Consistency', score: 80, na: false, reason: '' },
        { category: 'Paraphrase Robustness', score: 5, na: false, reason: '' },
        { category: 'N-gram Entropy', score: 20, na: false, reason: '' },
        { category: 'Sentence Length Variance', score: 15, na: false, reason: '' },
        { category: 'Stopword POS Distribution Skew', score: 25, na: false, reason: '' },
        { category: 'Punctuation Pattern Uniformity', score: 30, na: false, reason: '' },
        { category: 'Readability Z-Score', score: 10, na: false, reason: '' },
        { category: 'Character-Level Irregularities', score: 5, na: false, reason: '' },
        { category: 'Contradiction Consistency', score: 85, na: false, reason: '' },
        { category: 'Coreference Coherence', score: 90, na: false, reason: '' },
        { category: 'Temporal Consistency', score: 95, na: false, reason: '' },
        { category: 'Round-Trip Translation Stability', score: 75, na: false, reason: '' },
        { category: 'Order Perturbation Tolerance', score: 70, na: false, reason: '' },
        { category: 'Boilerplate Frequency', score: 40, na: false, reason: '' },
        { category: 'Scaffold Likelihood', score: 35, na: false, reason: '' },
        { category: 'Hedging Density', score: 50, na: false, reason: '' }
      ];
    }
    
    // Safety check for missing scores object
    if (!likelihood.scores || typeof likelihood.scores !== 'object') {
      return [];
    }

    // Metrics to exclude from bar graph (non-numeric or inappropriate scale)
    const excludedFromBarGraph = new Set([
      'Dominant Emotion',           // String value, not numeric
      'Emotional Variance',         // Too small scale (0.000x range)
      'Character-Level Irregularities'  // Usually 0, better in detailed view
    ]);

    return Object.entries(likelihood.scores)
      .filter(([category]) => !excludedFromBarGraph.has(category))
      .map(([category, data]) => ({
        category,
        score: data.percent,
        na: data.na,
        reason: data.reason || '',
        calculationMethod: data.calculationMethod
      }));
  }, [result]);

  return (
    <div className={`App ${compactMode ? 'compact' : ''}`}>
      <DesignTokens />
      <style>{creditBadgeStyles}</style>
      <style>{pricingPageStyles}</style>
      <style>{packageCardStyles}</style>
      <style>{purchaseModalStyles}</style>
      <style>{metricBadgeStyles}</style>
      <style>{authModalStyles}</style>
      <style>{tierBadgeStyles}</style>
      <style>{simpleResultStyles}</style>
      <style>{viewModeToggleStyles}</style>
      {/* SEO styles are lazy-loaded with the component */}
      
      <header className="App-header" style={{ padding: 24, textAlign: 'center', color: 'var(--text)' }}>
        <div className="container">
          <div className="card-contrast app-header-bar">
            <img ref={logoRef} src={theme === 'dark' ? logoDark : logoLight} className="App-logo" alt="logo" />
            <div>
              <div className="subtle">17 Metrics. One Analysis. Complete Content Intelligence.</div>
            </div>
            <div className="app-header-actions">
              <CreditBadge
                balance={creditBalance}
                isAuthenticated={isAuthenticated}
                onSignIn={handleSignIn}
                onBuyCredits={handleBuyCredits}
              />
              <ThemeToggle />
              <ViewModeToggle
                viewMode={viewMode}
                onChange={setViewMode}
                theme={theme}
              />
              <button className="btn btn-outline" onClick={() => setCompactMode(v => !v)} title="Toggle compact mode">{compactMode ? '↔️ Full' : '↕️ Compact'}</button>
            </div>
          </div>

          {/* Social Proof Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            flexWrap: 'wrap',
            padding: '16px 0',
            marginBottom: 24,
            fontSize: 14,
            color: 'var(--text-dim)',
            borderBottom: '1px solid var(--hairline)'
          }}>
            <span>🎯 <strong style={{color: 'var(--text)'}}>96%+ Accuracy</strong></span>
            <span>📊 <strong style={{color: 'var(--text)'}}>17+ Metrics</strong></span>
            <span>🤖 <strong style={{color: 'var(--text)'}}>20+ AI Models</strong></span>
            <span>🌍 <strong style={{color: 'var(--text)'}}>40+ Languages</strong></span>
          </div>

          {/* Feature Pills */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 24
          }}>
            {[
              { icon: '🤖', label: 'AI Detection' },
              { icon: '📊', label: 'SEO Analysis' },
              { icon: '🎯', label: 'GEO Optimization' },
              { icon: '💭', label: 'Emotion Mapping' },
              { icon: '🛡️', label: 'Toxicity Check' },
              { icon: '♿', label: 'Accessibility' }
            ].map(item => (
              <span 
                key={item.label}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'var(--bg-elev-1)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {item.icon} {item.label}
              </span>
            ))}
          </div>

        <form onSubmit={handleSubmit} className="app-form">
          {/* Hero Text Input - Primary CTA */}
          <div style={{
            marginBottom: 20,
            position: 'relative'
          }}>
            {/* Word count indicator */}
            {inputMode === 'text' && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                fontSize: 12,
                color: textContent.trim().split(/\s+/).filter(w => w).length < 50
                  ? 'var(--text-dim)'
                  : textContent.trim().split(/\s+/).filter(w => w).length >= 200
                    ? '#22c55e'
                    : '#f59e0b',
                background: 'var(--bg-elev-1)',
                padding: '4px 8px',
                borderRadius: 6,
                fontWeight: 500,
                zIndex: 1
              }}>
                {textContent.trim().split(/\s+/).filter(w => w).length} words
                {textContent.trim().split(/\s+/).filter(w => w).length < 50 && ' (min 50)'}
              </div>
            )}

            {inputMode === 'url' ? (
              <input
                type="text"
                placeholder="Enter URL to analyze..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="field"
                required
                style={{
                  fontSize: 16,
                  padding: '16px 20px',
                  borderRadius: 16,
                  border: '2px solid var(--border)',
                  background: 'var(--card)',
                  width: '100%',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              />
            ) : (
              <textarea
                placeholder="Paste your text here to check for AI content...

Enter at least 50 words for basic analysis, or 200+ words for best accuracy."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="field"
                required
                style={{
                  minHeight: 280,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  fontSize: 16,
                  lineHeight: 1.7,
                  width: '100%',
                  padding: '20px',
                  paddingTop: 44,
                  borderRadius: 16,
                  border: '2px solid var(--border)',
                  background: 'var(--card)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              />
            )}
          </div>

          {/* Input mode toggle - Now secondary */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            padding: 4,
            background: 'var(--bg-elev-1)',
            borderRadius: 12,
            border: 'var(--hairline)'
          }}>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: inputMode === 'text' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: inputMode === 'text' ? 'white' : 'var(--text)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Paste Text
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: inputMode === 'url' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
                color: inputMode === 'url' ? 'white' : 'var(--text)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              From URL
            </button>
          </div>
          
          {isAuthenticated && creditBalance !== null && creditBalance > 0 && (
            <label 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                fontSize: 14,
                color: 'var(--text)',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: 12,
                background: usePremium ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))' : 'var(--bg-elev-1)',
                border: usePremium ? '2px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--hairline)',
                transition: 'all 0.2s ease',
                boxShadow: usePremium ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
              }}
            >
              <input 
                type="checkbox" 
                checked={usePremium}
                onChange={(e) => setUsePremium(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  ✨ Use Premium Analysis
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  35+ metrics for comprehensive AI detection (88% accuracy), SEO, GEO, Accessibility & Emotional analysis
                  <span style={{ 
                    marginLeft: 8, 
                    fontSize: 11, 
                    color: usePremium ? '#f59e0b' : 'var(--text-dim)',
                    fontWeight: usePremium ? 700 : 400,
                    background: usePremium ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>
                    Costs 1 token
                  </span>
                </div>
              </div>
            </label>
          )}
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 12,
              padding: '16px 24px',
              fontSize: 18,
              fontWeight: 700,
              background: loading
                ? 'var(--bg-elev-2)'
                : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Analyzing..." : "Detect AI Content"}
          </button>
        </form>

        {loading && <p className="subtle">Loading…</p>}
        {error && <p style={{ color: "#fca5a5" }}>{error}</p>}

        {result && (
          <div className="app-results">
            {/* Simple mode view */}
            {viewMode === 'simple' && (() => {
              // Calculate overall AI likelihood and metrics for simple view
              const scores = result.aiLikelihood?.scores || {};
              const metricValues = Object.entries(scores)
                .filter(([_, data]) => typeof data === 'object' && !data.na && typeof data.percent === 'number')
                .map(([_, data]) => data.percent);

              const avgScore = metricValues.length > 0
                ? Math.round(metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length)
                : 50;

              const metricsCount = metricValues.length;

              // Calculate confidence based on number of metrics and consistency
              const confidenceValue = Math.min(100, 50 + metricsCount * 5);

              // Generate interpretation
              let interpretation = '';
              if (avgScore < 30) {
                interpretation = 'This content shows strong characteristics of human writing.';
              } else if (avgScore < 50) {
                interpretation = 'This content appears to be primarily human-written.';
              } else if (avgScore < 70) {
                interpretation = 'This content shows some AI-like patterns and may have been partially AI-assisted.';
              } else {
                interpretation = 'This content shows strong AI-generated characteristics.';
              }

              return (
                <SimpleResult
                  aiLikelihood={avgScore}
                  interpretation={interpretation}
                  confidence={confidenceValue}
                  metricsAnalyzed={metricsCount}
                  theme={theme}
                  onViewDetails={() => setViewMode('advanced')}
                />
              );
            })()}

            {/* Advanced mode view */}
            {viewMode === 'advanced' && (
              <>
            {/* Tier indicator */}
            {result.tier && (
              <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <TierBadge tier={result.tier} />
              </div>
            )}

            {/* Summary section */}
            <div className="card app-summary" style={{ marginBottom: 24, textAlign: 'left' }}>
              <h3 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Summary</h3>
              <p style={{
                whiteSpace: "pre-wrap",
                marginLeft: 16,
                paddingLeft: 16,
                borderLeft: "3px solid var(--border)",
                color: "var(--text-dim)",
                lineHeight: 1.7,
                textAlign: "left"
              }}>
                {result.summary}
              </p>

              {/* Key Points Table */}
              <h3 style={{ margin: 0, marginTop: 28, marginBottom: 16, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                Key Points
                <span style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: "var(--text-dim)",
                  marginLeft: 8,
                  background: "var(--bg-elev-1)",
                  padding: "2px 8px",
                  borderRadius: 4
                }}>
                  {(result.keyPoints ? result.keyPoints.split("\n").filter(pt => pt.trim().length > 0) : []).length} insights
                </span>
              </h3>

              {/* Visually impressive table layout */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "12px 16px",
                marginLeft: 16,
                padding: 16,
                background: "var(--bg-elev-1)",
                borderRadius: 12,
                border: "var(--hairline)"
              }}>
                {(result.keyPoints ? result.keyPoints.split("\n").filter(pt => pt.trim().length > 0) : []).map((pt: string, i: number) => (
                  <>
                    <div key={`num-${i}`} style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme === "dark" ? "#60a5fa" : "#3b82f6",
                      textAlign: "right",
                      paddingTop: 2
                    }}>
                      {i + 1}
                    </div>
                    <div key={`text-${i}`} style={{
                      fontSize: 14,
                      color: "var(--text)",
                      lineHeight: 1.6,
                      paddingBottom: i < (result.keyPoints ? result.keyPoints.split("\n").filter(pt => pt.trim().length > 0).length - 1 : 0) ? 12 : 0,
                      borderBottom: i < (result.keyPoints ? result.keyPoints.split("\n").filter(pt => pt.trim().length > 0).length - 1 : 0) ? "1px solid var(--border)" : "none"
                    }}>
                      {pt.trim()}
                    </div>
                  </>
                ))}
              </div>
              
              {/* Overall Score - Free Tier Only */}
              {result.tier === 'free' && result.aiLikelihood?.scores && (
                <div style={{ marginTop: 32 }}>
                  <h3 style={{ margin: 0, marginBottom: 16, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                    Overall Assessment
                  </h3>
                  <div style={{
                    padding: 24,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(147, 51, 234, 0.05))',
                    borderRadius: 16,
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
                  }}>
                    {(() => {
                      const scores = result.aiLikelihood.scores;
                      const metricValues = Object.entries(scores)
                        .filter(([_, data]) => typeof data === 'object' && !data.na && typeof data.percent === 'number')
                        .map(([_, data]) => data.percent);
                      
                      const avgScore = metricValues.length > 0
                        ? Math.round(metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length)
                        : 50;
                      
                      let assessment, color, bgColor, icon;
                      if (avgScore < 30) {
                        assessment = 'Likely Human-Written';
                        color = '#16a34a';
                        bgColor = 'rgba(34, 197, 94, 0.1)';
                        icon = '✓';
                      } else if (avgScore < 50) {
                        assessment = 'Probably Human-Written';
                        color = '#65a30d';
                        bgColor = 'rgba(132, 204, 22, 0.1)';
                        icon = '~';
                      } else if (avgScore < 70) {
                        assessment = 'Possibly AI-Generated';
                        color = '#ea580c';
                        bgColor = 'rgba(234, 88, 12, 0.1)';
                        icon = '?';
                      } else {
                        assessment = 'Likely AI-Generated';
                        color = '#dc2626';
                        bgColor = 'rgba(220, 38, 38, 0.1)';
                        icon = '⚠';
                      }
                      
                      return (
                        <>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            marginBottom: 16
                          }}>
                            <div style={{
                              fontSize: 48,
                              fontWeight: 900,
                              color: color,
                              background: bgColor,
                              width: 80,
                              height: 80,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {avgScore}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: color,
                                marginBottom: 4
                              }}>
                                {icon} {assessment}
                              </div>
                              <div style={{
                                fontSize: 13,
                                color: 'var(--text-dim)',
                                lineHeight: 1.5
                              }}>
                                Based on {metricValues.length} free tier metrics. Upgrade for 88% accuracy with 35+ premium metrics.
                              </div>
                            </div>
                          </div>
                          <div style={{
                            width: '100%',
                            height: 12,
                            background: 'var(--bg-elev-1)',
                            borderRadius: 999,
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${avgScore}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${color}dd, ${color})`,
                              borderRadius: 999,
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              <h3 style={{ marginTop: 16 }}>Toxicity Score</h3>
              <p>{result.tier === 'free' ? 'Available in Premium tier' : `${String(result.toxicityScore)}%`}</p>
              
              {/* Show comprehensive upgrade message for free tier */}
              {result.tier === 'free' && (
                <div style={{
                  marginTop: 24,
                  padding: 24,
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '3px solid #f59e0b',
                  borderRadius: 16,
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: 16, marginBottom: 16 }}>
                    <span style={{ fontSize: 32 }}>✨</span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 12px 0', color: '#92400e', fontSize: 20, fontWeight: 700 }}>
                        You're Using the FREE Tier
                      </h3>
                      <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#78350f', lineHeight: 1.6 }}>
                        This analysis includes <strong>basic metrics only</strong>. Upgrade to Premium for 5x more data and 25% better accuracy!
                      </p>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 12,
                        marginBottom: 16
                      }}>
                        <div style={{
                          padding: 12,
                          background: 'rgba(255, 255, 255, 0.7)',
                          borderRadius: 8,
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          <div style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 4 }}>
                            FREE Tier (Current)
                          </div>
                          <div style={{ fontSize: 11, color: '#78350f' }}>
                            • 7 basic metrics<br/>
                            • 70% AI detection accuracy<br/>
                            • Short summary only<br/>
                            • 3 analyses per day limit
                          </div>
                        </div>
                        
                        <div style={{
                          padding: 12,
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          borderRadius: 8,
                          border: '2px solid #3b82f6',
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                        }}>
                          <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 700, marginBottom: 4 }}>
                            💎 PREMIUM Tier
                          </div>
                          <div style={{ fontSize: 11, color: '#1e3a8a', lineHeight: 1.5 }}>
                            • <strong>35+ metrics</strong> (5x more data)<br/>
                            • <strong>88% AI accuracy</strong> (combined analysis)<br/>
                            • Full summary + key points<br/>
                            • SEO, GEO, Accessibility<br/>
                            • <strong>Unlimited analyses</strong><br/>
                            • Starting at $0.20/analysis
                          </div>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}>
                        {!isAuthenticated ? (
                          <>
                            <button
                              onClick={handleSignIn}
                              style={{
                                padding: '12px 24px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              Sign In to Upgrade
                            </button>
                            <button
                              onClick={() => setShowPricing(true)}
                              style={{
                                padding: '12px 24px',
                                background: theme === 'dark' ? 'transparent' : 'white',
                                color: '#3b82f6',
                                border: '2px solid #3b82f6',
                                borderRadius: 10,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = theme === 'dark' ? 'transparent' : 'white'; }}
                            >
                              View Pricing
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleBuyCredits}
                            style={{
                              padding: '12px 24px',
                              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: 15,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'; }}
                          >
                            Buy Credits & Upgrade
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show premium features summary for paid tier */}
              {result.tier === 'paid' && (
                <div style={{
                  marginTop: 20,
                  padding: 20,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #3b82f6',
                  borderRadius: 12,
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <h3 style={{ margin: 0, color: '#1e40af' }}>Premium Features Active</h3>
                    <PremiumFeatureBadge feature="Premium Tier" />
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: '#1e3a8a',
                    marginBottom: 16,
                    lineHeight: 1.6
                  }}>
                    Your premium analysis includes advanced ML models, comprehensive content analysis, and enhanced ensemble scoring for maximum accuracy.
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 12
                  }}>
                    {/* Enhanced AI Detection */}
                    <div style={{
                      padding: 14,
                      background: 'white',
                      borderRadius: 8,
                      border: '1px solid #bfdbfe',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        🎯 Enhanced Ensemble
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                        {result.aiLikelihood?.ensembleScore?.premium_enhancement ?
                          `Using ${result.aiLikelihood.ensembleScore.premium_enhancement.enhanced_metrics_count} metrics (+${result.aiLikelihood.ensembleScore.premium_enhancement.metrics_added} premium) with linguistic analysis, advanced readability, and statistical fingerprinting` :
                          '27+ advanced metrics including lexical diversity, POS ratios, and readability consensus'
                        }
                      </div>
                    </div>

                    {/* SEO Analysis */}
                    {result.seo && (
                      <div style={{
                        padding: 14,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                          🔍 SEO Analysis
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                          Score: {result.seo.overall_seo_score}/100 ({result.seo.grade})<br/>
                          Technical SEO, on-page optimization, meta tags, structured data, and performance metrics
                        </div>
                      </div>
                    )}

                    {/* GEO Analysis */}
                    {result.geo && (
                      <div style={{
                        padding: 14,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                          🤖 GEO Optimization
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                          Score: {result.geo.overall_geo_score}/100 ({result.geo.grade})<br/>
                          AI engine optimization, citation readiness, source credibility, and content depth analysis
                        </div>
                      </div>
                    )}

                    {/* Accessibility Analysis */}
                    {result.accessibility && (
                      <div style={{
                        padding: 14,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                          ♿ Accessibility
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                          Score: {result.accessibility.overall_accessibility_score}/100 ({result.accessibility.grade})<br/>
                          WCAG 2.1 compliance, readability, semantic HTML, and assistive technology support
                        </div>
                      </div>
                    )}

                    {/* Emotional Analysis */}
                    {result.emotional && (
                      <div style={{
                        padding: 14,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                          💭 Emotional Analysis
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                          Dominant: {result.emotional.dominant_emotion || 'neutral'}<br/>
                          NRC Emotion Lexicon analysis with 8 emotion categories, sentiment scoring, and AI pattern detection
                        </div>
                      </div>
                    )}

                    {/* Premium NLP Metrics */}
                    {result.premiumMetrics && (
                      <div style={{
                        padding: 14,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                          🧠 Advanced NLP
                        </div>
                        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                          {[
                            result.premiumMetrics.perplexity && 'Perplexity (DistilGPT-2)',
                            result.premiumMetrics.readability && `${Object.keys(result.premiumMetrics.readability).length} readability metrics`,
                            result.premiumMetrics.linguistics && 'Linguistic complexity',
                            result.premiumMetrics.statistics && 'Statistical fingerprint'
                          ].filter(Boolean).join(', ')}
                          {result.premiumMetrics.computeTime && ` • ${result.premiumMetrics.computeTime}`}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{
                    fontSize: 11,
                    color: '#1e40af',
                    marginTop: 16,
                    padding: 10,
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: 6,
                    borderLeft: '3px solid #3b82f6'
                  }}>
                    <strong>💎 Premium Value:</strong> All metrics and analyses are integrated into the ensemble scoring system for the most accurate AI detection available with actionable SEO, GEO, and Accessibility improvements.
                  </div>
                </div>
              )}
              
              {/* Show locked premium metrics preview for FREE tier users */}
              {result.tier === 'free' && (
                <div data-testid="premium-preview-locked" style={{
                  marginTop: 20,
                  padding: 20,
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  border: '2px dashed #9ca3af',
                  borderRadius: 12,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  opacity: 0.7,
                  position: 'relative',
                  cursor: 'not-allowed'
                }}>
                  <div style={{ 
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#fbbf24',
                    color: '#78350f',
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    🔒 LOCKED
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 20, filter: 'grayscale(100%)' }}>🌟</span>
                    <h3 style={{ margin: 0, color: '#6b7280' }}>Premium Analysis Preview</h3>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 12,
                    marginBottom: 12,
                    filter: 'blur(2px)'
                  }}>
                    {/* Perplexity - Locked */}
                    <div style={{ 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      border: '1px solid #d1d5db'
                    }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Perplexity Score</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>
                        ••••
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        DistilGPT-2 (82M params)
                      </div>
                    </div>
                    
                    {/* Readability Metrics - Locked */}
                    <div style={{ 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      border: '1px solid #d1d5db'
                    }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Readability Analysis</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>
                        9
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        Flesch, Gunning Fog, SMOG, etc.
                      </div>
                    </div>
                    
                    {/* Linguistics Metrics - Locked */}
                    <div style={{ 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      border: '1px solid #d1d5db'
                    }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Linguistic Complexity</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>
                        4
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        POS, NER, Lexical Diversity
                      </div>
                    </div>
                    
                    {/* Statistics Metrics - Locked */}
                    <div style={{ 
                      padding: 12, 
                      background: '#f9fafb', 
                      borderRadius: 8,
                      border: '1px solid #d1d5db'
                    }}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Statistical Analysis</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#9ca3af' }}>
                        3
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                        Skewness, Kurtosis, CV
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    fontSize: 13, 
                    color: '#374151',
                    padding: 12,
                    background: '#fef3c7',
                    borderRadius: 6,
                    border: '1px solid #fbbf24',
                    textAlign: 'center',
                    fontWeight: 600
                  }}>
                    <span style={{ fontSize: 16, marginRight: 8 }}>⚡</span>
                    Upgrade to Premium to unlock 17 advanced metrics including ML-based perplexity analysis, comprehensive readability suite, and deep linguistic profiling
                    <div style={{ marginTop: 8 }}>
                      <button 
                        onClick={() => setShowPricing(true)}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 20px',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}
                      >
                        View Premium Plans
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-dashboard app-dashboard">
              <div className="app-dashboard-header">
                <h3 style={{ margin: 0 }}>AI Detector Dashboard</h3>
                <small style={{ color: "var(--text-dim)" }}>Powered by Joshua Burdick</small>
              </div>
              <AnalyticsPanel analyticsData={analyticsData} result={result} theme={theme} />
            </div>

            {/* SEO & GEO Dashboard with Tabs */}
            {(result.seo || result.geo) && (
              <div className="optimization-dashboard app-dashboard">
                <div className="app-dashboard-header">
                  <h3 style={{ margin: 0 }}>
                    {result.tier === 'free' ? 'Content Optimization Preview' : 'Content Optimization Analysis'}
                  </h3>
                  <small style={{ color: "var(--text-dim)" }}>
                    {result.tier === 'free' 
                      ? 'Limited SEO, GEO & Emotional Metrics - Upgrade for full analysis' 
                      : 'SEO, GEO, Accessibility & Emotional Metrics'}
                  </small>
                </div>

                {/* Tab Navigation */}
                <div style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 24,
                  borderBottom: '2px solid var(--hairline)',
                  paddingBottom: 0
                }}>
                  {result.seo && (
                    <button
                      onClick={() => setActiveAnalysisTab('seo')}
                      style={{
                        padding: '12px 20px',
                        background: activeAnalysisTab === 'seo' ? 'var(--card)' : 'transparent',
                        border: 'none',
                        borderBottom: activeAnalysisTab === 'seo' ? '2px solid #3b82f6' : '2px solid transparent',
                        color: activeAnalysisTab === 'seo' ? '#3b82f6' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '-2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeAnalysisTab !== 'seo') {
                          e.currentTarget.style.color = 'var(--text)';
                          e.currentTarget.style.background = 'var(--bg-elev-1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeAnalysisTab !== 'seo') {
                          e.currentTarget.style.color = 'var(--text-dim)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>🔍</span>
                      SEO Analysis
                    </button>
                  )}

                  {result.geo && (
                    <button
                      onClick={() => setActiveAnalysisTab('geo')}
                      style={{
                        padding: '12px 20px',
                        background: activeAnalysisTab === 'geo' ? 'var(--card)' : 'transparent',
                        border: 'none',
                        borderBottom: activeAnalysisTab === 'geo' ? '2px solid #8b5cf6' : '2px solid transparent',
                        color: activeAnalysisTab === 'geo' ? '#8b5cf6' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '-2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeAnalysisTab !== 'geo') {
                          e.currentTarget.style.color = 'var(--text)';
                          e.currentTarget.style.background = 'var(--bg-elev-1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeAnalysisTab !== 'geo') {
                          e.currentTarget.style.color = 'var(--text-dim)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>🤖</span>
                      GEO Analysis
                    </button>
                  )}

                  {/* Accessibility Tab - Always show */}
                  <button
                    onClick={() => setActiveAnalysisTab('accessibility')}
                    style={{
                      padding: '12px 20px',
                      background: activeAnalysisTab === 'accessibility' ? 'var(--card)' : 'transparent',
                      border: 'none',
                      borderBottom: activeAnalysisTab === 'accessibility' ? '2px solid #f59e0b' : '2px solid transparent',
                      color: activeAnalysisTab === 'accessibility' ? '#f59e0b' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '-2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onMouseEnter={(e) => {
                      if (activeAnalysisTab !== 'accessibility') {
                        e.currentTarget.style.color = 'var(--text)';
                        e.currentTarget.style.background = 'var(--bg-elev-1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeAnalysisTab !== 'accessibility') {
                        e.currentTarget.style.color = 'var(--text-dim)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>♿</span>
                    Accessibility
                  </button>

                  <button
                    onClick={() => setActiveAnalysisTab('emotional')}
                    style={{
                      padding: '12px 20px',
                      background: activeAnalysisTab === 'emotional' ? 'var(--card)' : 'transparent',
                      border: 'none',
                      borderBottom: activeAnalysisTab === 'emotional' ? '2px solid #8b5cf6' : '2px solid transparent',
                      color: activeAnalysisTab === 'emotional' ? '#8b5cf6' : 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      borderRadius: '8px 8px 0 0',
                      marginBottom: '-2px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onMouseEnter={(e) => {
                      if (activeAnalysisTab !== 'emotional') {
                        e.currentTarget.style.color = 'var(--text)';
                        e.currentTarget.style.background = 'var(--bg-elev-1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeAnalysisTab !== 'emotional') {
                        e.currentTarget.style.color = 'var(--text-dim)';
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>💭</span>
                    Emotional
                  </button>

                  {result.seo && result.geo && (
                    <button
                      onClick={() => setActiveAnalysisTab('combined')}
                      style={{
                        padding: '12px 20px',
                        background: activeAnalysisTab === 'combined' ? 'var(--card)' : 'transparent',
                        border: 'none',
                        borderBottom: activeAnalysisTab === 'combined' ? '2px solid #22c55e' : '2px solid transparent',
                        color: activeAnalysisTab === 'combined' ? '#22c55e' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '-2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        if (activeAnalysisTab !== 'combined') {
                          e.currentTarget.style.color = 'var(--text)';
                          e.currentTarget.style.background = 'var(--bg-elev-1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeAnalysisTab !== 'combined') {
                          e.currentTarget.style.color = 'var(--text-dim)';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span>📊</span>
                      Combined View
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                {activeAnalysisTab === 'seo' && result.seo && (
                  <Suspense fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div className="spinner" style={{ margin: '0 auto 12px' }} />
                      Loading SEO analysis...
                    </div>
                  }>
                    <SeoAnalysisSection result={result.seo} theme={theme} />
                  </Suspense>
                )}

                {activeAnalysisTab === 'geo' && result.geo && (
                  <Suspense fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div className="spinner" style={{ margin: '0 auto 12px' }} />
                      Loading GEO analysis...
                    </div>
                  }>
                    <GeoAnalysisSection result={result.geo} theme={theme} />
                  </Suspense>
                )}

                {/* Accessibility Tab Content */}
                {activeAnalysisTab === 'accessibility' && (
                  <Suspense fallback={<div />}>
                    <AccessibilityAnalysisSection result={result.accessibility} theme={theme} />
                  </Suspense>
                )}

                {/* Emotional Tab Content */}
                {activeAnalysisTab === 'emotional' && (
                  <Suspense fallback={<div />}>
                    <EmotionalAnalysisSection result={result.emotional} theme={theme} />
                  </Suspense>
                )}

                {activeAnalysisTab === 'combined' && result.seo && result.geo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {/* Score Comparison */}
                    <div className="card" style={{
                      border: 'var(--hairline)',
                      borderRadius: 16,
                      padding: 20,
                      background: 'var(--card)',
                      boxShadow: 'var(--shadow-1)'
                    }}>
                      <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
                        📊 Overall Score Comparison
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 20
                      }}>
                        {/* SEO Score */}
                        <div style={{
                          padding: 16,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #dbeafe20 0%, #3b82f620 100%)',
                          border: '2px solid #3b82f640'
                        }}>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                            🔍 SEO Score
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>
                            {result.seo.overall_seo_score}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                            {result.seo.grade || 'N/A'}
                          </div>
                        </div>

                        {/* GEO Score */}
                        <div style={{
                          padding: 16,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #f3e8ff20 0%, #8b5cf620 100%)',
                          border: '2px solid #8b5cf640'
                        }}>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                            🤖 GEO Score
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>
                            {result.geo.overall_geo_score}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                            {result.geo.grade || 'N/A'}
                          </div>
                        </div>

                        {/* Combined Optimization Score */}
                        <div style={{
                          padding: 16,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #ecfdf520 0%, #22c55e20 100%)',
                          border: '2px solid #22c55e40'
                        }}>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
                            📈 Combined Score
                          </div>
                          <div style={{ fontSize: 32, fontWeight: 700, color: '#22c55e' }}>
                            {Math.round((result.seo.overall_seo_score + result.geo.overall_geo_score) / 2)}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                            Average
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Side-by-side sections */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                      gap: 24
                    }}>
                      {/* SEO Section */}
                      <div>
                        <h4 style={{
                          margin: '0 0 16px 0',
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span>🔍</span>
                          SEO Analysis
                        </h4>
                        <Suspense fallback={<div>Loading...</div>}>
                          <SeoAnalysisSection result={result.seo} theme={theme} />
                        </Suspense>
                      </div>

                      {/* GEO Section */}
                      <div>
                        <h4 style={{
                          margin: '0 0 16px 0',
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#8b5cf6',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <span>🤖</span>
                          GEO Analysis
                        </h4>
                        <Suspense fallback={<div>Loading...</div>}>
                          <GeoAnalysisSection result={result.geo} theme={theme} />
                        </Suspense>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        )}
              </div>
      </header>

      {/* What You Get Section */}
      <section style={{
        padding: '64px 20px',
        borderTop: '1px solid var(--hairline)',
        background: 'var(--bg)'
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ 
              margin: 0, 
              marginBottom: 12, 
              fontSize: 32, 
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              One Analysis. Seventeen Answers.
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: 16, 
              color: 'var(--text-dim)',
              maxWidth: 600,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Other tools tell you if content is AI-generated. We tell you everything else too.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24
          }}>
            {[
              {
                icon: '🤖',
                title: 'AI Detection',
                description: '18 metrics reveal AI authorship + which model wrote it',
                detail: 'Perplexity, burstiness, lexical diversity, sentence patterns. Know not just IF it\'s AI, but WHICH AI.'
              },
              {
                icon: '📊',
                title: 'SEO Score',
                description: '8-category audit with actionable recommendations',
                detail: 'Title, meta, headings, images, links, structured data, social cards, mobile optimization.'
              },
              {
                icon: '🎯',
                title: 'GEO Ready',
                description: 'Will AI search engines cite your content?',
                detail: 'Quotable facts, entity clarity, FAQ coverage—optimized for ChatGPT, Perplexity, Google AI.'
              },
              {
                icon: '💭',
                title: 'Emotional Analysis',
                description: '8 emotions mapped for authenticity scoring',
                detail: 'Joy, trust, fear, surprise, sadness, disgust, anger, anticipation. AI shows flat variance.'
              },
              {
                icon: '🛡️',
                title: 'Toxicity Safety',
                description: 'Content safety scoring for all audiences',
                detail: 'Multi-category toxicity detection ensures content is appropriate for any audience.'
              },
              {
                icon: '♿',
                title: 'Accessibility',
                description: 'WCAG compliance and remediation tips',
                detail: 'Ensure your content is accessible to everyone with detailed compliance checking.'
              }
            ].map(feature => (
              <div 
                key={feature.title}
                style={{
                  padding: 24,
                  borderRadius: 16,
                  background: 'var(--card)',
                  border: '1px solid var(--hairline)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{feature.icon}</div>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: 8, 
                  fontSize: 18, 
                  fontWeight: 600,
                  color: 'var(--text)'
                }}>
                  {feature.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  marginBottom: 12,
                  fontSize: 14, 
                  fontWeight: 500,
                  color: 'var(--text)'
                }}>
                  {feature.description}
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: 13, 
                  color: 'var(--text-dim)',
                  lineHeight: 1.5
                }}>
                  {feature.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section style={{
        padding: '64px 20px',
        borderTop: '1px solid var(--hairline)',
        background: 'var(--bg-elev-1)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ 
              margin: 0, 
              marginBottom: 12, 
              fontSize: 32, 
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              Other Tools Answer One Question.
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: 18, 
              color: 'var(--text-dim)'
            }}>
              We answer seventeen.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 14
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--hairline)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text)' }}>Feature</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>GPTZero</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>Originality</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text)', background: 'var(--bg)' }}>OriginLytics</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI Detection', '✓', '✓', '✓'],
                  ['Model Attribution', '✗', '✗', '✓ GPT/Claude/Gemini'],
                  ['SEO Analysis', '✗', '✗', '✓ 8 categories'],
                  ['GEO Optimization', '✗', '✗', '✓'],
                  ['Emotional Analysis', '✗', '✗', '✓ 8 emotions'],
                  ['Toxicity Detection', '✗', '✗', '✓'],
                  ['Accessibility', '✗', '✗', '✓ WCAG'],
                  ['Total Metrics', '1', '2', '17+']
                ].map(([feature, gpt, orig, us], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{feature}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>{gpt}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>{orig}</td>
                    <td style={{ 
                      padding: '12px 16px', 
                      textAlign: 'center', 
                      fontWeight: 600, 
                      color: 'var(--text)',
                      background: 'var(--bg)'
                    }}>{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{
        padding: '64px 20px',
        borderTop: '1px solid var(--hairline)',
        background: 'var(--bg)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ 
              margin: 0, 
              marginBottom: 12, 
              fontSize: 32, 
              fontWeight: 700,
              color: 'var(--text)'
            }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div>
            {[
              {
                q: 'What is OriginLytics?',
                a: 'OriginLytics is a content intelligence platform that analyzes web content across 17+ metrics including AI detection, SEO, GEO (AI search optimization), emotional analysis, toxicity, and accessibility. Unlike single-purpose AI detectors, OriginLytics provides comprehensive content insights in one analysis.'
              },
              {
                q: 'How is OriginLytics different from GPTZero or Originality.ai?',
                a: 'GPTZero and Originality.ai focus solely on AI detection. OriginLytics includes AI detection PLUS SEO analysis (8 categories), GEO optimization for AI search, emotional analysis (8 emotions), toxicity detection, and accessibility testing—17+ metrics total in one comprehensive report.'
              },
              {
                q: 'How accurate is OriginLytics\' AI detection?',
                a: 'OriginLytics achieves 96%+ accuracy using an ensemble of 18 metrics including perplexity analysis, burstiness detection, lexical diversity, and emotional variance—far more comprehensive than single-score detectors.'
              },
              {
                q: 'What is GEO Analysis?',
                a: 'GEO (Generative Engine Optimization) analyzes whether your content is optimized to appear in AI search engines like ChatGPT, Perplexity, and Google AI Overviews. OriginLytics checks quotable fact density, entity clarity, FAQ coverage, and other factors that determine AI citation probability.'
              },
              {
                q: 'What AI models can OriginLytics detect?',
                a: 'OriginLytics can detect and attribute content to specific AI models including ChatGPT (GPT-3.5, GPT-4, GPT-4o), Claude, Gemini, Llama, Mistral, and 20+ other AI writing tools.'
              },
              {
                q: 'How much does OriginLytics cost?',
                a: 'OriginLytics offers 3 free analyses per day. Additional analyses use credits: 10 credits for $4.99, 25 for $9.99, 100 for $29.99, or 500 for $99.99. Credits never expire.'
              }
            ].map((item, i) => (
              <details 
                key={i}
                style={{
                  marginBottom: 16,
                  padding: 20,
                  borderRadius: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--hairline)'
                }}
              >
                <summary style={{
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  listStyle: 'none'
                }}>
                  {item.q}
                </summary>
                <p style={{
                  margin: 0,
                  marginTop: 16,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: 'var(--text-dim)'
                }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {(booting || loading) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner" />
            <div className="subtle">{booting ? 'Starting up…' : 'Thinking…'}</div>
          </div>
        </div>
      )}
      
      {showPricing && (
        <PricingPage 
          packages={packages}
          onSelectPackage={handleSelectPackage}
          loading={purchaseModal.isOpen && purchaseModal.type === 'loading'}
          onClose={() => setShowPricing(false)}
        />
      )}
      
      <PurchaseModal 
        isOpen={purchaseModal.isOpen}
        onClose={() => setPurchaseModal({ ...purchaseModal, isOpen: false })}
        message={purchaseModal.message}
        type={purchaseModal.type}
      />
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
