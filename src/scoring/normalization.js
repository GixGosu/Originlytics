/**
 * Metric Normalization Module
 * Standardizes all metrics to 0-100 scale where higher = more AI-like
 */

// Calibration thresholds based on empirical observations
const THRESHOLDS = {
  // Statistical metrics
  burstiness: {
    human: [0.5, 1.5],      // Humans have higher burstiness (variety)
    ai: [-0.5, 0.5]         // AI is more uniform (low burstiness)
  },
  sentence_variance: {
    human: [50, 150],       // High variance = human
    ai: [10, 40]            // Low variance = AI
  },
  punctuation_uniformity: {
    human: [0.3, 0.6],      // Moderate uniformity
    ai: [0.7, 0.9]          // High uniformity = AI
  },
  readability_zscore: {
    human: [-1, 1],         // Natural variation
    ai: [-0.5, 0.5]         // Consistent readability
  },
  ngram_entropy: {
    human: [4.5, 6.0],      // High entropy = diverse
    ai: [3.0, 4.0]          // Low entropy = repetitive
  },
  character_irregularities: {
    human: [60, 90],        // Irregular patterns
    ai: [20, 50]            // Regular patterns
  },

  // Linguistic metrics (premium)
  lexical_diversity: {
    human: [0.6, 0.85],     // High diversity
    ai: [0.25, 0.45]        // Low diversity (repetitive)
  },
  noun_verb_ratio: {
    human: [1.5, 2.2],      // Balanced
    ai: [2.5, 3.8]          // Noun-heavy
  },
  adj_noun_ratio: {
    human: [0.3, 0.5],      // Moderate adjectives
    ai: [0.15, 0.3]         // Fewer adjectives
  },
  syntactic_complexity: {
    human: [3, 6],          // Varied depth
    ai: [2, 4]              // Shallow trees
  },

  // Readability metrics (premium)
  avg_grade_level: {
    human: [8, 14],         // Wide range
    ai: [10, 12]            // Narrow range
  },
  flesch_reading_ease: {
    human: [30, 70],        // Varied
    ai: [45, 60]            // Consistent
  },
  difficult_words_ratio: {
    human: [0.1, 0.3],      // Natural distribution
    ai: [0.05, 0.15]        // Fewer difficult words
  },

  // Statistical fingerprint (premium)
  sentence_length_skewness: {
    human: [0.3, 1.5],      // Skewed distribution
    ai: [-0.2, 0.2]         // Symmetric
  },
  sentence_length_kurtosis: {
    human: [0.5, 2.0],      // Fat tails
    ai: [-0.5, 0.5]         // Normal distribution
  },
  coefficient_of_variation: {
    human: [0.45, 0.75],    // High variation
    ai: [0.2, 0.4]          // Low variation
  },

  // Emotional metrics
  emotional_variance: {
    human: [0.08, 0.25],    // Varied emotions
    ai: [0.01, 0.06]        // Flat emotions
  },

  // AI-estimated metrics (already 0-100)
  // These don't need thresholds
};

/**
 * Normalize any metric to 0-100 scale
 * @param {string} metricName - Name of the metric
 * @param {number} value - Raw metric value
 * @returns {number} Normalized score (0-100, higher = more AI-like)
 */
function normalizeMetric(metricName, value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 50; // Neutral fallback for missing data
  }

  // Handle metrics that are already 0-100 (perplexity, AI-estimated metrics)
  if (metricName.includes('perplexity') ||
      metricName.includes('semantic_consistency') ||
      metricName.includes('common_patterns') ||
      metricName.includes('paraphrase_robustness') ||
      metricName.includes('stopword_pos') ||
      metricName.includes('contradiction') ||
      metricName.includes('coreference') ||
      metricName.includes('temporal') ||
      metricName.includes('round_trip') ||
      metricName.includes('order_perturbation') ||
      metricName.includes('boilerplate') ||
      metricName.includes('scaffold') ||
      metricName.includes('hedging')) {
    return Math.max(0, Math.min(100, value));
  }

  // Get thresholds for this metric
  const threshold = THRESHOLDS[metricName];
  if (!threshold) {
    // Unknown metric - try to infer normalization
    console.warn(`No threshold defined for metric: ${metricName}`);
    return inferNormalization(value);
  }

  const [humanMin, humanMax] = threshold.human;
  const [aiMin, aiMax] = threshold.ai;

  // Determine if metric is "inverted" (lower = more AI-like)
  const isInverted = aiMin < humanMin;

  if (isInverted) {
    // Lower values = more AI-like (e.g., lexical diversity, burstiness)
    if (value <= aiMax) {
      // Strongly AI-like
      const position = (value - aiMin) / (aiMax - aiMin);
      return 70 + (position * 30); // 70-100 range
    } else if (value <= humanMin) {
      // Transitional zone
      const position = (value - aiMax) / (humanMin - aiMax);
      return 50 + (position * 20); // 50-70 range
    } else if (value <= humanMax) {
      // Human-like zone
      const position = (value - humanMin) / (humanMax - humanMin);
      return 30 - (position * 20); // 30-10 range
    } else {
      // Very human-like
      return Math.max(0, 10 - ((value - humanMax) * 2));
    }
  } else {
    // Higher values = more AI-like (e.g., noun/verb ratio, punctuation uniformity)
    if (value >= aiMin) {
      // Strongly AI-like
      const position = Math.min(1, (value - aiMin) / (aiMax - aiMin + 0.01));
      return 70 + (position * 30); // 70-100 range
    } else if (value >= humanMax) {
      // Transitional zone
      const position = (value - humanMax) / (aiMin - humanMax + 0.01);
      return 50 + (position * 20); // 50-70 range
    } else if (value >= humanMin) {
      // Human-like zone
      const position = (value - humanMin) / (humanMax - humanMin + 0.01);
      return 30 - (position * 20); // 30-10 range
    } else {
      // Very human-like
      return Math.max(0, 10 - ((humanMin - value) * 2));
    }
  }
}

/**
 * Infer normalization for unknown metrics
 * Attempts to determine if 0-1 scale, 0-100 scale, or z-score
 */
function inferNormalization(value) {
  if (value >= 0 && value <= 1) {
    // Likely a 0-1 ratio - convert to 0-100
    return value * 100;
  } else if (value >= 0 && value <= 100) {
    // Already 0-100
    return value;
  } else if (Math.abs(value) <= 5) {
    // Likely a z-score or small ratio - sigmoid transform
    return sigmoid(value) * 100;
  } else {
    // Unknown range - apply sigmoid
    return sigmoid(value / 10) * 100;
  }
}

/**
 * Sigmoid function for z-score normalization
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Extract metric value from metrics object
 * Handles nested structures and premium metrics
 */
function extractMetricValue(metrics, metricName) {
  // Direct lookup
  if (metrics[metricName] !== undefined) {
    return metrics[metricName];
  }

  // Check in nested objects (premium metrics)
  if (metrics.readability && metrics.readability[metricName] !== undefined) {
    return metrics.readability[metricName];
  }

  if (metrics.linguistics && metrics.linguistics[metricName] !== undefined) {
    return metrics.linguistics[metricName];
  }

  if (metrics.statistics && metrics.statistics[metricName] !== undefined) {
    return metrics.statistics[metricName];
  }

  if (metrics.emotions && metrics.emotions[metricName] !== undefined) {
    return metrics.emotions[metricName];
  }

  // Check scores object
  if (metrics.scores && metrics.scores[metricName] !== undefined) {
    return metrics.scores[metricName];
  }

  return null;
}

/**
 * Normalize all metrics in a metrics object
 * @param {object} metrics - Raw metrics from analysis
 * @returns {object} Normalized metrics (all 0-100)
 */
function normalizeAllMetrics(metrics) {
  const normalized = {};

  // List of all metrics to normalize
  const metricNames = [
    // Free tier statistical
    'burstiness',
    'sentence_variance',
    'punctuation_uniformity',
    'readability_zscore',
    'ngram_entropy',
    'character_irregularities',

    // Premium linguistic
    'lexical_diversity',
    'noun_verb_ratio',
    'adj_noun_ratio',
    'syntactic_complexity',

    // Premium readability
    'avg_grade_level',
    'flesch_reading_ease',
    'difficult_words_ratio',

    // Premium statistical
    'sentence_length_skewness',
    'sentence_length_kurtosis',
    'coefficient_of_variation',

    // Emotional
    'emotional_variance',

    // Model-based
    'perplexity',

    // AI-estimated
    'common_patterns',
    'semantic_consistency',
    'paraphrase_robustness',
    'stopword_pos',
    'contradiction_consistency',
    'coreference_coherence',
    'temporal_consistency',
    'round_trip_translation',
    'order_perturbation',
    'boilerplate_frequency',
    'scaffold_likelihood',
    'hedging_density'
  ];

  for (const metricName of metricNames) {
    const value = extractMetricValue(metrics, metricName);
    if (value !== null) {
      normalized[metricName] = normalizeMetric(metricName, value);
    }
  }

  return normalized;
}

module.exports = {
  normalizeMetric,
  normalizeAllMetrics,
  extractMetricValue,
  THRESHOLDS
};
