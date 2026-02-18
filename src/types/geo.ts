// GEO (Generative Engine Optimization) Type Definitions
// For AI platform citation optimization (ChatGPT, Claude, Perplexity, Gemini)

/**
 * Priority level for GEO recommendations
 */
export type GeoRecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Individual GEO recommendation
 */
export interface GeoRecommendation {
  // Clear, actionable text
  text: string;

  // Priority level (affects display order and styling)
  priority: GeoRecommendationPriority;

  // Optional additional context
  details?: string;
}

/**
 * Individual metric score
 */
export interface GeoMetricScore {
  [metric: string]: number;
}

/**
 * AI platform compatibility indicators
 */
export interface AiPlatformCompatibility {
  chatgpt?: 'excellent' | 'good' | 'medium' | 'poor';
  claude?: 'excellent' | 'good' | 'medium' | 'poor';
  perplexity?: 'excellent' | 'good' | 'medium' | 'poor';
  gemini?: 'excellent' | 'good' | 'medium' | 'poor';
}

/**
 * Main GEO analysis result interface
 * This matches the expected backend response structure
 */
export interface GeoResult {
  // Overall score (0-100)
  overall_geo_score: number;

  // Optional letter grade (A+, A, B, etc.)
  grade?: string;

  // Brief one-line summary
  summary?: string;

  // Individual metric scores (0-100 each)
  scores: GeoMetricScore;

  // Actionable recommendations grouped by priority
  recommendations: GeoRecommendation[];

  // GEO-specific metadata
  citation_readiness?: 'high' | 'medium' | 'low';
  ai_platforms?: AiPlatformCompatibility;
  content_type?: 'article' | 'documentation' | 'blog' | 'research' | 'tutorial';

  // Breakdown details (optional)
  breakdown?: {
    [key: string]: {
      score: number;
      issues: string[];
      recommendations: GeoRecommendation[];
      metadata?: any;
    };
  };
}

/**
 * Expected metric keys
 */
export type GeoMetricKey =
  | 'Citation Structure'
  | 'Source Credibility'
  | 'Structured Data'
  | 'Content Freshness'
  | 'Author Attribution'
  | 'Factual Clarity'
  | 'Data Presence'
  | 'Content Depth';
