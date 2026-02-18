/**
 * TypeScript type definitions for Accessibility Analysis
 * Based on WCAG 2.1 compliance testing
 */

export interface AccessibilityResult {
  // Overall accessibility score (0-100)
  overall_accessibility_score: number;

  // Letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)
  grade: string;

  // Human-readable summary
  summary: string;

  // Individual metric scores (0-100 each)
  scores: {
    'WCAG Level A': number;
    'WCAG Level AA': number;
    'WCAG Level AAA': number;
    'Color Contrast': number;
    'Keyboard Navigation': number;
    'Screen Reader Support': number;
    'Responsive Design': number;
    'Semantic HTML': number;
  };

  // WCAG compliance details
  wcag_compliance: WCAGCompliance;

  // Actionable recommendations
  recommendations: AccessibilityRecommendation[];

  // Analysis metadata
  metadata: AccessibilityMetadata;
}

export interface WCAGCompliance {
  // Compliance status for each level
  level_a: boolean;
  level_aa: boolean;
  level_aaa: boolean;

  // Detailed violations (top 20)
  violations: AccessibilityViolation[];
}

export interface AccessibilityViolation {
  // Violation identifier
  id: string;

  // Impact level: critical, serious, moderate, minor
  impact: 'critical' | 'serious' | 'moderate' | 'minor';

  // Human-readable description
  description: string;

  // How to fix it
  help: string;

  // Link to documentation
  help_url: string;

  // WCAG tags
  tags: string[];

  // Number of affected elements
  nodes_affected: number;

  // Example HTML (truncated)
  example_html: string;

  // CSS selector target
  example_target: string;

  // All affected nodes (up to 20)
  affected_nodes: Array<{
    html: string;
    target: string;
    failure_summary: string;
  }>;
}

export interface AccessibilityRecommendation {
  // Recommendation text
  text: string;

  // Priority level
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Detailed explanation
  details: string;

  // Number of affected elements (optional)
  affected_elements?: number;
}

export interface AccessibilityMetadata {
  // URL that was tested
  url: string;

  // ISO timestamp of analysis
  tested_at: string;

  // WCAG version
  wcag_version: string;

  // Tool used (e.g., "axe-core 4.8.0")
  tool: string;

  // Statistics
  total_violations: number;
  total_passes: number;
  total_incomplete: number;
  total_inapplicable: number;
}

// Additional detailed result interfaces (optional, for future expansion)

export interface ColorContrastResult {
  score: number;
  violations_count: number;
  elements_with_issues: number;
  details: Array<{
    description: string;
    impact: string;
    affected_elements: number;
  }>;
}

export interface KeyboardNavigationResult {
  score: number;
  violations_count: number;
  has_focus_issues: boolean;
  has_tabindex_issues: boolean;
  details: any[];
}

export interface ScreenReaderResult {
  score: number;
  violations_count: number;
  has_aria_issues: boolean;
  has_label_issues: boolean;
  has_alt_issues: boolean;
  details: any[];
}

export interface ResponsiveDesignResult {
  score: number;
  viewports_tested: number;
  total_issues: number;
  results: Array<{
    viewport: string;
    width: number;
    issues_found: number;
    has_horizontal_scroll: boolean;
    small_touch_targets: number;
  }>;
  error?: string;
}

export interface SemanticHTMLResult {
  score: number;
  violations_count: number;
  has_heading_issues: boolean;
  has_landmark_issues: boolean;
  details: any[];
}
