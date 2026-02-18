/**
 * Ensemble Score Module
 * Creates pseudo-ensemble AI detection by intelligently combining multiple metrics
 */

const { normalizeMetric, extractMetricValue } = require('./normalization');

// Metric weights - optimized for AI detection accuracy
// Total weight = 1.00 (100%)
const METRIC_WEIGHTS = {
  // High-confidence metrics (30% total) - Most reliable AI indicators
  perplexity: 0.15,                    // Transformer model output
  lexical_diversity: 0.08,              // Strong human/AI differentiator
  character_irregularities: 0.07,       // Pattern-based detection

  // Statistical metrics (25% total) - Robust across text types
  burstiness: 0.08,                    // Sentence variety
  sentence_variance: 0.08,             // Length patterns
  punctuation_uniformity: 0.06,        // Punctuation habits
  ngram_entropy: 0.03,                 // Word pattern diversity

  // Linguistic markers (20% total) - Grammar and structure
  noun_verb_ratio: 0.07,               // AI tends to be noun-heavy
  syntactic_complexity: 0.06,          // Parse tree depth
  adj_noun_ratio: 0.04,                // Adjective usage
  coefficient_of_variation: 0.03,      // Consistency metric

  // Readability consensus (15% total) - Multiple algorithms agree
  avg_grade_level: 0.06,               // Educational level
  flesch_reading_ease: 0.05,           // Readability score
  difficult_words_ratio: 0.04,         // Vocabulary complexity

  // AI-estimated ensemble (10% total) - GPT-4o-mini estimates
  semantic_consistency: 0.03,          // Meaning coherence
  common_patterns: 0.03,               // AI fingerprints
  paraphrase_robustness: 0.02,         // Rephrasing stability
  contradiction_consistency: 0.02,     // Logical coherence

  // Emotional analysis (5% total) - New dimension
  emotional_variance: 0.05             // Emotional range (AI is flat)
};

// Adaptive weight adjustments based on text characteristics
const ADAPTIVE_WEIGHTS = {
  short: {  // < 200 words
    // Emphasize linguistic markers, reduce statistical
    lexical_diversity: 1.5,
    noun_verb_ratio: 1.3,
    syntactic_complexity: 1.2,
    burstiness: 0.7,
    sentence_variance: 0.7,
    emotional_variance: 1.4
  },
  medium: {  // 200-1000 words
    // Balanced weights (use defaults)
  },
  long: {  // > 1000 words
    // Emphasize statistical, reduce linguistic
    burstiness: 1.3,
    sentence_variance: 1.3,
    coefficient_of_variation: 1.4,
    perplexity: 1.2,
    lexical_diversity: 0.8,
    noun_verb_ratio: 0.8
  }
};

/**
 * Calculate weighted ensemble score
 * @param {object} metrics - All metrics (normalized to 0-100)
 * @param {number} textLength - Word count for adaptive weighting
 * @returns {object} Ensemble scoring results
 */
function calculateEnsembleScore(metrics, textLength = 500) {
  // Determine text length category
  const lengthCategory = textLength < 200 ? 'short' :
                         textLength > 1000 ? 'long' : 'medium';

  // Get adaptive weights
  const adaptiveAdjustments = ADAPTIVE_WEIGHTS[lengthCategory] || {};

  let totalScore = 0;
  let totalWeight = 0;
  const votes = [];
  const contributingMetrics = [];
  const missingMetrics = [];

  // Calculate weighted score
  for (const [metricName, baseWeight] of Object.entries(METRIC_WEIGHTS)) {
    const normalizedValue = metrics[metricName];

    if (normalizedValue !== undefined && normalizedValue !== null && !isNaN(normalizedValue)) {
      // Apply adaptive weight adjustment
      const adjustmentFactor = adaptiveAdjustments[metricName] || 1.0;
      const weight = baseWeight * adjustmentFactor;

      totalScore += normalizedValue * weight;
      totalWeight += weight;

      // Binary vote for confidence calculation
      const isAiVote = normalizedValue > 50 ? 1 : 0;
      votes.push(isAiVote);

      // Track contributing metrics for explanation
      if (Math.abs(normalizedValue - 50) > 15) {  // Significant deviation
        contributingMetrics.push({
          name: metricName,
          score: Math.round(normalizedValue),
          weight: weight,
          impact: normalizedValue > 50 ? 'AI-like' : 'Human-like'
        });
      }
    } else {
      missingMetrics.push(metricName);
    }
  }

  // Normalize final score
  const ensembleScore = totalWeight > 0 ? totalScore / totalWeight : 50;

  // Calculate confidence based on vote agreement
  if (votes.length > 0) {
    const majorityVote = ensembleScore > 50 ? 1 : 0;
    const agreement = votes.filter(v => v === majorityVote).length / votes.length;
    var confidence = agreement * 100;
  } else {
    var confidence = 0;
  }

  // Sort contributing metrics by impact
  contributingMetrics.sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50));

  // Generate interpretation
  const interpretation = interpretScore(ensembleScore, confidence);

  // Generate key indicators (top 3 most impactful metrics)
  const keyIndicators = contributingMetrics.slice(0, 3).map(m => {
    const direction = m.score > 50 ? 'high' : 'low';
    return `${formatMetricName(m.name)}: ${direction} (${m.score}/100)`;
  });

  return {
    overall_score: Math.round(ensembleScore),
    confidence: Math.round(confidence),
    interpretation,
    key_indicators: keyIndicators,
    metrics_used: votes.length,
    metrics_missing: missingMetrics.length,
    text_length_category: lengthCategory,
    contributing_metrics: contributingMetrics.slice(0, 10)  // Top 10
  };
}

/**
 * Analyze metric group disagreement
 * @param {object} metrics - Normalized metrics
 * @returns {object} Disagreement analysis
 */
function analyzeDisagreement(metrics) {
  const groups = {
    statistical: ['burstiness', 'sentence_variance', 'punctuation_uniformity', 'ngram_entropy', 'character_irregularities'],
    linguistic: ['lexical_diversity', 'noun_verb_ratio', 'adj_noun_ratio', 'syntactic_complexity'],
    readability: ['flesch_reading_ease', 'avg_grade_level', 'difficult_words_ratio'],
    model_based: ['perplexity'],
    emotional: ['emotional_variance'],
    ai_estimated: ['semantic_consistency', 'common_patterns', 'paraphrase_robustness', 'contradiction_consistency']
  };

  const groupScores = {};
  const groupCounts = {};

  for (const [groupName, metricList] of Object.entries(groups)) {
    let sum = 0;
    let count = 0;

    for (const metricName of metricList) {
      const value = metrics[metricName];
      if (value !== undefined && value !== null && !isNaN(value)) {
        sum += value;
        count++;
      }
    }

    if (count > 0) {
      groupScores[groupName] = Math.round(sum / count);
      groupCounts[groupName] = count;
    }
  }

  // Calculate variance across groups
  const scores = Object.values(groupScores);
  if (scores.length < 2) {
    return {
      status: 'insufficient_data',
      message: 'Not enough metric groups for disagreement analysis',
      group_scores: groupScores
    };
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // High disagreement threshold
  if (stdDev > 20) {
    return {
      status: 'uncertain',
      message: 'Metrics show conflicting signals - manual review recommended',
      variance: Math.round(variance),
      std_dev: Math.round(stdDev),
      group_scores: groupScores,
      outlier_groups: findOutlierGroups(groupScores, mean, stdDev)
    };
  } else if (stdDev > 12) {
    return {
      status: 'moderate_disagreement',
      message: 'Some metric groups disagree, but overall trend is clear',
      variance: Math.round(variance),
      std_dev: Math.round(stdDev),
      group_scores: groupScores
    };
  } else {
    return {
      status: 'confident',
      message: 'All metric groups show strong agreement',
      variance: Math.round(variance),
      std_dev: Math.round(stdDev),
      group_scores: groupScores
    };
  }
}

/**
 * Find groups that deviate significantly from mean
 */
function findOutlierGroups(groupScores, mean, stdDev) {
  const outliers = [];

  for (const [group, score] of Object.entries(groupScores)) {
    const deviation = Math.abs(score - mean);
    if (deviation > stdDev * 1.5) {
      outliers.push({
        group,
        score,
        deviation: Math.round(deviation)
      });
    }
  }

  return outliers;
}

/**
 * Interpret overall score and confidence
 */
function interpretScore(score, confidence) {
  let likelihood;
  if (score >= 80) likelihood = 'Very likely AI-generated';
  else if (score >= 65) likelihood = 'Likely AI-generated';
  else if (score >= 45) likelihood = 'Uncertain (mixed signals)';
  else if (score >= 30) likelihood = 'Likely human-written';
  else likelihood = 'Very likely human-written';

  let confidenceLevel;
  if (confidence >= 85) confidenceLevel = 'very high confidence';
  else if (confidence >= 70) confidenceLevel = 'high confidence';
  else if (confidence >= 55) confidenceLevel = 'moderate confidence';
  else confidenceLevel = 'low confidence';

  return `${likelihood} with ${confidenceLevel}`;
}

/**
 * Format metric name for display
 */
function formatMetricName(name) {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Main function: Calculate full ensemble analysis
 * @param {object} rawMetrics - Raw metrics from analysis
 * @param {number} textLength - Word count
 * @returns {object} Complete ensemble results
 */
function calculateFullEnsemble(rawMetrics, textLength) {
  // First, normalize all metrics to 0-100
  const normalizedMetrics = {};

  // Extract and normalize each metric
  for (const [metricName] of Object.entries(METRIC_WEIGHTS)) {
    const value = extractMetricValue(rawMetrics, metricName);
    if (value !== null && value !== undefined) {
      normalizedMetrics[metricName] = normalizeMetric(metricName, value);
    }
  }

  // Calculate ensemble score
  const ensembleResult = calculateEnsembleScore(normalizedMetrics, textLength);

  // Analyze disagreement
  const disagreementAnalysis = analyzeDisagreement(normalizedMetrics);

  // Combine results
  return {
    ...ensembleResult,
    ensemble_details: disagreementAnalysis.group_scores || {},
    agreement_analysis: {
      status: disagreementAnalysis.status,
      message: disagreementAnalysis.message,
      variance: disagreementAnalysis.variance || 0,
      outliers: disagreementAnalysis.outlier_groups || []
    }
  };
}

module.exports = {
  calculateEnsembleScore,
  calculateFullEnsemble,
  analyzeDisagreement,
  METRIC_WEIGHTS
};
