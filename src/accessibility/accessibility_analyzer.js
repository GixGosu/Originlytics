/**
 * Accessibility Analyzer - WCAG 2.1 Compliance Testing
 * Uses @axe-core/playwright for comprehensive accessibility analysis
 *
 * Tests 6 key areas:
 * 1. WCAG Compliance (Level A, AA, AAA)
 * 2. Color Contrast
 * 3. Keyboard Navigation
 * 4. Screen Reader Support (ARIA)
 * 5. Responsive Design
 * 6. Semantic HTML
 */

const { AxeBuilder } = require('@axe-core/playwright');

/**
 * Main accessibility analysis function
 * @param {import('playwright').Page} page - Playwright page object (reused from scraping)
 * @param {string} url - URL being analyzed
 * @returns {Promise<object>} Accessibility analysis results
 */
async function analyzeAccessibility(page, url) {
  console.log('[Accessibility] Starting WCAG 2.1 analysis for:', url);

  try {
    // Run comprehensive axe-core scan
    const axeResults = await new AxeBuilder({ page })
      .withTags([
        'wcag2a',
        'wcag2aa',
        'wcag2aaa',
        'wcag21a',
        'wcag21aa',
        'wcag22aa',
        'best-practice'
      ])
      .analyze();

    console.log(`[Accessibility] Found ${axeResults.violations.length} violations, ${axeResults.passes.length} passes`);

    // Calculate individual feature scores
    const wcagCompliance = calculateWCAGCompliance(axeResults);
    const colorContrast = analyzeColorContrast(axeResults);
    const keyboardNav = analyzeKeyboardNavigation(axeResults);
    const screenReader = analyzeScreenReaderSupport(axeResults);
    const responsiveDesign = await analyzeResponsiveDesign(page);
    const semanticHTML = analyzeSemanticHTML(axeResults);

    // Calculate overall score (weighted average)
    const scores = {
      'WCAG Level A': wcagCompliance.level_a_score,
      'WCAG Level AA': wcagCompliance.level_aa_score,
      'WCAG Level AAA': wcagCompliance.level_aaa_score,
      'Color Contrast': colorContrast.score,
      'Keyboard Navigation': keyboardNav.score,
      'Screen Reader Support': screenReader.score,
      'Responsive Design': responsiveDesign.score,
      'Semantic HTML': semanticHTML.score
    };

    const overallScore = calculateOverallScore(scores);
    const grade = calculateGrade(overallScore);

    // Generate actionable recommendations
    const recommendations = generateRecommendations(axeResults, {
      colorContrast,
      keyboardNav,
      screenReader,
      responsiveDesign,
      semanticHTML
    });

    return {
      overall_accessibility_score: Math.round(overallScore),
      grade,
      summary: generateSummary(overallScore, wcagCompliance, axeResults.violations.length),
      scores,
      wcag_compliance: {
        level_a: wcagCompliance.level_a_compliant,
        level_aa: wcagCompliance.level_aa_compliant,
        level_aaa: wcagCompliance.level_aaa_compliant,
        violations: formatViolations(axeResults.violations.slice(0, 20)) // Top 20
      },
      recommendations,
      metadata: {
        url,
        tested_at: new Date().toISOString(),
        wcag_version: '2.1',
        tool: `axe-core ${axeResults.testEngine.version}`,
        total_violations: axeResults.violations.length,
        total_passes: axeResults.passes.length,
        total_incomplete: axeResults.incomplete.length,
        total_inapplicable: axeResults.inapplicable.length
      }
    };

  } catch (error) {
    console.error('[Accessibility] Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Calculate WCAG compliance scores for each level
 */
function calculateWCAGCompliance(axeResults) {
  const levelA = filterByWCAGLevel(axeResults, ['wcag2a', 'wcag21a']);
  const levelAA = filterByWCAGLevel(axeResults, ['wcag2aa', 'wcag21aa', 'wcag22aa']);
  const levelAAA = filterByWCAGLevel(axeResults, ['wcag2aaa']);

  return {
    level_a_score: calculateComplianceScore(levelA),
    level_aa_score: calculateComplianceScore(levelAA),
    level_aaa_score: calculateComplianceScore(levelAAA),
    level_a_compliant: levelA.violations === 0,
    level_aa_compliant: levelAA.violations === 0,
    level_aaa_compliant: levelAAA.violations === 0
  };
}

/**
 * Filter axe results by WCAG level tags
 */
function filterByWCAGLevel(axeResults, tags) {
  const violations = axeResults.violations.filter(v =>
    v.tags.some(t => tags.includes(t))
  ).length;

  const passes = axeResults.passes.filter(p =>
    p.tags.some(t => tags.includes(t))
  ).length;

  return { violations, passes };
}

/**
 * Calculate compliance score (0-100)
 */
function calculateComplianceScore({ violations, passes }) {
  const total = violations + passes;
  if (total === 0) return 100;
  return Math.round((passes / total) * 100);
}

/**
 * Analyze color contrast issues
 */
function analyzeColorContrast(axeResults) {
  const contrastViolations = axeResults.violations.filter(v =>
    v.id === 'color-contrast' || v.id.includes('contrast')
  );

  const contrastPasses = axeResults.passes.filter(p =>
    p.id === 'color-contrast' || p.id.includes('contrast')
  );

  const totalElements = contrastViolations.reduce((sum, v) => sum + v.nodes.length, 0);
  const passedElements = contrastPasses.reduce((sum, p) => sum + p.nodes.length, 0);
  const total = totalElements + passedElements;

  const score = total > 0 ? Math.round((passedElements / total) * 100) : 100;

  return {
    score,
    violations_count: contrastViolations.length,
    elements_with_issues: totalElements,
    details: contrastViolations.slice(0, 5).map(v => ({
      description: v.description,
      impact: v.impact,
      affected_elements: v.nodes.length
    }))
  };
}

/**
 * Analyze keyboard navigation
 */
function analyzeKeyboardNavigation(axeResults) {
  const keyboardViolations = axeResults.violations.filter(v =>
    v.tags.includes('keyboard') ||
    v.id.includes('focus') ||
    v.id === 'tabindex'
  );

  const keyboardPasses = axeResults.passes.filter(p =>
    p.tags.includes('keyboard') ||
    p.id.includes('focus')
  );

  const violations = keyboardViolations.length;
  const passes = keyboardPasses.length;
  const score = passes + violations > 0 ?
    Math.round((passes / (passes + violations)) * 100) : 100;

  return {
    score,
    violations_count: violations,
    has_focus_issues: keyboardViolations.some(v => v.id.includes('focus')),
    has_tabindex_issues: keyboardViolations.some(v => v.id === 'tabindex'),
    details: keyboardViolations.slice(0, 5)
  };
}

/**
 * Analyze screen reader support (ARIA)
 */
function analyzeScreenReaderSupport(axeResults) {
  const ariaViolations = axeResults.violations.filter(v =>
    v.tags.includes('aria') ||
    v.tags.includes('screen-reader') ||
    v.id.includes('aria') ||
    v.id.includes('label') ||
    v.id.includes('alt')
  );

  const ariaPasses = axeResults.passes.filter(p =>
    p.tags.includes('aria') ||
    p.id.includes('aria') ||
    p.id.includes('label') ||
    p.id.includes('alt')
  );

  const violations = ariaViolations.length;
  const passes = ariaPasses.length;
  const score = passes + violations > 0 ?
    Math.round((passes / (passes + violations)) * 100) : 100;

  return {
    score,
    violations_count: violations,
    has_aria_issues: ariaViolations.some(v => v.id.includes('aria')),
    has_label_issues: ariaViolations.some(v => v.id.includes('label')),
    has_alt_issues: ariaViolations.some(v => v.id === 'image-alt'),
    details: ariaViolations.slice(0, 5)
  };
}

/**
 * Analyze responsive design across viewports
 */
async function analyzeResponsiveDesign(page) {
  const viewports = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' }
  ];

  const results = [];
  let issuesFound = 0;

  try {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Check for horizontal scrolling
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Check for touch target sizes (mobile only)
      let smallTargets = 0;
      if (viewport.name === 'mobile') {
        smallTargets = await page.evaluate(() => {
          const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
          let count = 0;
          interactiveElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) count++;
          });
          return count;
        });
      }

      const issues = (hasHorizontalScroll ? 1 : 0) + (smallTargets > 0 ? 1 : 0);
      issuesFound += issues;

      results.push({
        viewport: viewport.name,
        width: viewport.width,
        issues_found: issues,
        has_horizontal_scroll: hasHorizontalScroll,
        small_touch_targets: smallTargets
      });
    }

    // Reset viewport to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Score: 100 if no issues, penalize for each issue
    const score = Math.max(0, 100 - (issuesFound * 15));

    return {
      score,
      viewports_tested: viewports.length,
      total_issues: issuesFound,
      results
    };

  } catch (error) {
    console.error('[Accessibility] Responsive design test failed:', error.message);
    return {
      score: 50,
      viewports_tested: 0,
      total_issues: 0,
      error: error.message,
      results: []
    };
  }
}

/**
 * Analyze semantic HTML structure
 */
function analyzeSemanticHTML(axeResults) {
  const semanticViolations = axeResults.violations.filter(v =>
    v.id.includes('heading') ||
    v.id.includes('landmark') ||
    v.id.includes('list') ||
    v.id.includes('region') ||
    v.tags.includes('best-practice')
  );

  const semanticPasses = axeResults.passes.filter(p =>
    p.id.includes('heading') ||
    p.id.includes('landmark') ||
    p.id.includes('list') ||
    p.id.includes('region')
  );

  const violations = semanticViolations.length;
  const passes = semanticPasses.length;
  const score = passes + violations > 0 ?
    Math.round((passes / (passes + violations)) * 100) : 100;

  return {
    score,
    violations_count: violations,
    has_heading_issues: semanticViolations.some(v => v.id.includes('heading')),
    has_landmark_issues: semanticViolations.some(v => v.id.includes('landmark')),
    details: semanticViolations.slice(0, 5)
  };
}

/**
 * Calculate overall accessibility score (weighted average)
 */
function calculateOverallScore(scores) {
  const weights = {
    'WCAG Level A': 0.20,
    'WCAG Level AA': 0.20,
    'WCAG Level AAA': 0.10,
    'Color Contrast': 0.15,
    'Keyboard Navigation': 0.10,
    'Screen Reader Support': 0.10,
    'Responsive Design': 0.10,
    'Semantic HTML': 0.05
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [metric, score] of Object.entries(scores)) {
    const weight = weights[metric] || 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate letter grade from score
 */
function calculateGrade(score) {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

/**
 * Generate human-readable summary
 */
function generateSummary(overallScore, wcagCompliance, violationsCount) {
  if (overallScore >= 90) {
    return `Excellent accessibility with ${violationsCount} minor issues. Site is ${wcagCompliance.level_aa_compliant ? 'WCAG AA compliant' : 'close to WCAG AA compliance'}.`;
  } else if (overallScore >= 70) {
    return `Good accessibility with ${violationsCount} issues to address. Some improvements needed for WCAG AA compliance.`;
  } else if (overallScore >= 50) {
    return `Fair accessibility with ${violationsCount} issues. Significant improvements needed for WCAG compliance.`;
  } else {
    return `Poor accessibility with ${violationsCount} critical issues. Immediate action required for WCAG compliance.`;
  }
}

/**
 * Format violations for output
 */
function formatViolations(violations) {
  return violations.map(v => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
    help_url: v.helpUrl,
    tags: v.tags,
    nodes_affected: v.nodes.length,
    example_html: v.nodes[0]?.html?.substring(0, 200) || '',
    example_target: v.nodes[0]?.target?.join(' > ') || '',
    // Include all affected nodes (up to 20) for detailed reporting
    affected_nodes: v.nodes.slice(0, 20).map(node => ({
      html: node.html?.substring(0, 300) || '',
      target: node.target?.join(' > ') || '',
      failure_summary: node.failureSummary || ''
    }))
  }));
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(axeResults, featureResults) {
  const recommendations = [];

  // Critical violations
  const criticalViolations = axeResults.violations.filter(v => v.impact === 'critical');
  if (criticalViolations.length > 0) {
    recommendations.push({
      text: `Fix ${criticalViolations.length} critical accessibility ${criticalViolations.length === 1 ? 'issue' : 'issues'}`,
      priority: 'critical',
      details: criticalViolations[0].description,
      affected_elements: criticalViolations.reduce((sum, v) => sum + v.nodes.length, 0)
    });
  }

  // Color contrast
  if (featureResults.colorContrast.score < 80) {
    recommendations.push({
      text: `Improve color contrast for ${featureResults.colorContrast.elements_with_issues} elements`,
      priority: 'high',
      details: 'Text elements need higher contrast ratios to meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).'
    });
  }

  // Keyboard navigation
  if (featureResults.keyboardNav.score < 80) {
    recommendations.push({
      text: `Fix ${featureResults.keyboardNav.violations_count} keyboard navigation issues`,
      priority: 'high',
      details: 'Ensure all interactive elements are keyboard accessible and have visible focus indicators.'
    });
  }

  // Screen reader
  if (featureResults.screenReader.has_alt_issues) {
    recommendations.push({
      text: 'Add alt text to images for screen readers',
      priority: 'high',
      details: 'All images should have descriptive alt attributes for screen reader users.'
    });
  }

  // Responsive design
  if (featureResults.responsiveDesign.total_issues > 0) {
    recommendations.push({
      text: `Fix ${featureResults.responsiveDesign.total_issues} responsive design issues`,
      priority: 'medium',
      details: 'Ensure content works on all viewport sizes and touch targets are large enough (44×44px minimum).'
    });
  }

  // Semantic HTML
  if (featureResults.semanticHTML.has_heading_issues) {
    recommendations.push({
      text: 'Fix heading hierarchy structure',
      priority: 'medium',
      details: 'Ensure headings follow logical order (H1 > H2 > H3) and do not skip levels.'
    });
  }

  // If no recommendations, add positive feedback
  if (recommendations.length === 0) {
    recommendations.push({
      text: 'Excellent! No major accessibility issues found.',
      priority: 'low',
      details: 'Continue monitoring accessibility as content changes.'
    });
  }

  return recommendations;
}

module.exports = {
  analyzeAccessibility
};
