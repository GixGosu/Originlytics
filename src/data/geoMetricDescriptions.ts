// GEO Metric Descriptions
// Provides user-friendly explanations for each GEO (Generative Engine Optimization) metric
// Based on research from .claude/analysis/geo-fundamentals.md and geo-citation-factors.md

export interface GeoMetricDescription {
  name: string;
  description: string;
  good_range: string;
  ai_impact: string; // Why this matters for AI citations
}

export const GEO_METRIC_DESCRIPTIONS: Record<string, GeoMetricDescription> = {
  "Citation Structure": {
    name: "Citation Structure",
    description: "Analyzes how well your content is structured for AI extraction. Includes presence of lists, tables, clear sections with descriptive headings, and scannable formats.",
    good_range: "Multiple bulleted/numbered lists, tables, 200-300 word content blocks, descriptive H2/H3 headings",
    ai_impact: "AI models prefer structured, scannable content. Lists and tables are 40% more likely to be cited than plain paragraphs.",
  },
  "Source Credibility": {
    name: "Source Credibility (E-E-A-T)",
    description: "Evaluates Experience, Expertise, Authoritativeness, and Trustworthiness signals. Checks for author info, credentials, publication dates, and authoritative citations.",
    good_range: "Author name, bio, credentials, publication date, citations to .edu/.gov sources",
    ai_impact: "Author credibility increases AI citations by 340%. AI models heavily weight expertise signals when selecting sources.",
  },
  "Structured Data": {
    name: "Structured Data (Schema.org)",
    description: "Validates Schema.org markup (JSON-LD) that helps AI platforms understand content context. Article, Author, FAQ, and HowTo schemas are particularly valuable.",
    good_range: "Article schema with author, FAQPage for Q&A content, HowTo for tutorials, Organization schema",
    ai_impact: "GPT-4 accuracy improves from 16% to 54% with proper structured data. Essential for AI understanding.",
  },
  "Content Freshness": {
    name: "Content Freshness",
    description: "Checks for publication and last-modified dates, update frequency signals, and temporal relevance. Fresh content is strongly preferred by AI platforms.",
    good_range: "Visible publication date, last updated date, content less than 3 months old for trending topics",
    ai_impact: "Recent content is 2.5x more likely to be cited. AI platforms prioritize current information.",
  },
  "Author Attribution": {
    name: "Author Attribution",
    description: "Verifies clear author identification including name, title, bio, credentials, and expertise. Strong author signals build trust with AI systems.",
    good_range: "Author name, professional title, bio paragraph, credentials, contact info, social proof",
    ai_impact: "Clear authorship is critical for AI trust. Missing author info reduces citation probability by 60%.",
  },
  "Factual Clarity": {
    name: "Factual Clarity",
    description: "Assesses how well claims are sourced and documented. Checks for external citations, source attribution, and fact-checking indicators.",
    good_range: "Claims cited with sources, links to authoritative external sites, publication years, clear attribution",
    ai_impact: "Well-sourced content is 3x more likely to be cited. AI models verify claims through cross-referencing.",
  },
  "Data Presence": {
    name: "Data Presence",
    description: "Evaluates use of statistics, research citations, data points, and quantifiable information. Data-rich content performs better with AI.",
    good_range: "Multiple statistics with sources, research study citations, charts/graphs, quantified claims",
    ai_impact: "Data-driven content has 50% higher citation rates. AI platforms favor evidence-based information.",
  },
  "Content Depth": {
    name: "Content Depth",
    description: "Measures comprehensiveness through word count, topic coverage breadth, multiple perspectives, and detailed explanations.",
    good_range: "2000+ words for comprehensive topics, multiple subtopics covered, various perspectives, related concepts",
    ai_impact: "Comprehensive content (2000+ words) is 2x more likely to be cited than shallow content (<1000 words).",
  },
};

/**
 * Helper function to get GEO score tier/color
 * Higher scores = better GEO (better AI citation potential)
 * Uses purple theme to differentiate from blue SEO theme
 */
export function geoScoreToTier(score: number, isDark: boolean = false) {
  // Excellent (90-100)
  if (score >= 90) {
    return {
      label: "Excellent",
      bg: isDark ? "#4c1d95" : "#f3e8ff",
      fg: isDark ? "#c084fc" : "#6b21a8",
      bar: isDark ? "#a855f7" : "#8b5cf6"
    };
  }

  // Good (75-89)
  if (score >= 75) {
    return {
      label: "Good",
      bg: isDark ? "#1e3a8a" : "#dbeafe",
      fg: isDark ? "#93c5fd" : "#1e40af",
      bar: isDark ? "#60a5fa" : "#3b82f6"
    };
  }

  // Fair (60-74)
  if (score >= 60) {
    return {
      label: "Fair",
      bg: isDark ? "#14532d" : "#ecfdf5",
      fg: isDark ? "#86efac" : "#047857",
      bar: isDark ? "#4ade80" : "#22c55e"
    };
  }

  // Needs Improvement (40-59)
  if (score >= 40) {
    return {
      label: "Needs Improvement",
      bg: isDark ? "#451a03" : "#fffbeb",
      fg: isDark ? "#fcd34d" : "#b45309",
      bar: isDark ? "#fbbf24" : "#f59e0b"
    };
  }

  // Poor (0-39)
  return {
    label: "Poor",
    bg: isDark ? "#451a1a" : "#fee2e2",
    fg: isDark ? "#fca5a5" : "#b91c1c",
    bar: isDark ? "#f87171" : "#ef4444"
  };
}
