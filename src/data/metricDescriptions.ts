// Metric Descriptions and Configuration
// Extracted from App.tsx for better maintainability

export interface MetricDescription {
  description: string;
  interpretation: string;
}

// Metric descriptions for AI detection
export const METRIC_DESCRIPTIONS: Record<string, MetricDescription> = {
  "Burstiness": {
    description: "Analyzes the variance in sentence lengths and complexity. AI text often has more uniform patterns than human writing.",
    interpretation: "Higher scores indicate more AI-like uniformity in text structure."
  },
  "Common Patterns": {
    description: "Detects repetitive phrasing patterns that are characteristic of AI generation algorithms.",
    interpretation: "Higher scores suggest AI-generated content with detectable pattern repetition."
  },
  "Semantic Consistency": {
    description: "Evaluates how well the text maintains logical coherence and semantic flow throughout.",
    interpretation: "Higher scores indicate stronger semantic coherence and lower AI likelihood (↑ better)."
  },
  "Paraphrase Robustness": {
    description: "Tests how well the text maintains meaning when paraphrased, a weakness in some AI systems.",
    interpretation: "Higher scores indicate stronger semantic understanding and lower AI likelihood (↑ better)."
  },
  "N-gram Entropy": {
    description: "Measures the diversity of word combinations. AI text often has lower entropy (more repetitive) than human writing.",
    interpretation: "Higher scores indicate more repetitive patterns (lower diversity), suggesting AI generation."
  },
  "Sentence Length Variance": {
    description: "Analyzes the consistency of sentence lengths throughout the text.",
    interpretation: "Very uniform sentence lengths suggest AI generation."
  },
  "Stopword POS Distribution Skew": {
    description: "Examines the distribution of parts-of-speech for common words (the, and, etc.).",
    interpretation: "Significant skew from human norms indicates AI generation."
  },
  "Punctuation Pattern Uniformity": {
    description: "Checks for unnatural patterns in punctuation usage and placement.",
    interpretation: "Highly uniform punctuation suggests AI-generated text."
  },
  "Readability Z-Score": {
    description: "Compares text readability against established human writing benchmarks.",
    interpretation: "Extreme z-scores (positive or negative) may indicate AI generation."
  },
  "Character-Level Irregularities": {
    description: "Detects unusual character patterns or encoding artifacts from AI generation.",
    interpretation: "Presence of irregularities suggests AI-generated content."
  },
  "Contradiction Consistency": {
    description: "Checks for logical contradictions within the text that AI systems sometimes produce.",
    interpretation: "Higher scores indicate better consistency (fewer contradictions) and lower AI likelihood (↑ better)."
  },
  "Coreference Coherence": {
    description: "Evaluates how well pronouns and references maintain coherence throughout the text.",
    interpretation: "Higher scores indicate better coreference coherence and lower AI likelihood (↑ better)."
  },
  "Temporal Consistency": {
    description: "Verifies that time references and chronological events remain logically consistent.",
    interpretation: "Higher scores indicate better temporal coherence and lower AI likelihood (↑ better)."
  },
  "Round-Trip Translation Stability": {
    description: "Measures how well meaning is preserved through translation and back-translation.",
    interpretation: "Higher scores indicate better semantic preservation and lower AI likelihood (↑ better)."
  },
  "Order Perturbation Tolerance": {
    description: "Evaluates how well the text maintains coherence when sentence order is changed.",
    interpretation: "Higher scores indicate stronger discourse understanding and lower AI likelihood (↑ better)."
  },
  "Boilerplate Frequency": {
    description: "Detects generic, templated phrases that appear in AI-generated content.",
    interpretation: "Higher frequency suggests AI generation using common templates."
  },
  "Scaffold Likelihood": {
    description: "Identifies structural scaffolding or frameworks that AI systems often use.",
    interpretation: "High likelihood indicates AI-generated content following learned structures."
  },
  "Hedging Density": {
    description: "Measures the frequency of hedging language (maybe, perhaps, could be) in the text.",
    interpretation: "Unusual hedging patterns may indicate AI generation."
  },
  "Toxicity Score": {
    description: "Evaluates the presence of toxic or harmful content using AI moderation systems.",
    interpretation: "While not directly related to AI generation, toxicity patterns can be indicative."
  },
  "Perplexity (Premium)": {
    description: "Measures text predictability using DistilGPT-2 transformer model (82M parameters). More accurate than basic perplexity.",
    interpretation: "Higher scores indicate more surprising, creative text (human-like). Lower scores suggest predictable patterns (AI-like)."
  },
  "Flesch Reading Ease": {
    description: "Measures how easy text is to read on a scale of 0-100. Premium readability metric.",
    interpretation: "Extreme scores (very low or very high) may indicate AI generation."
  },
  "Flesch-Kincaid Grade": {
    description: "Estimates the U.S. school grade level needed to understand the text.",
    interpretation: "Unusual grade levels for the content type may indicate AI."
  },
  "Gunning Fog Index": {
    description: "Estimates years of formal education needed to understand text on first reading.",
    interpretation: "Inconsistent complexity for content type suggests AI generation."
  },
  "SMOG Index": {
    description: "Simple Measure of Gobbledygook - estimates years of education needed.",
    interpretation: "Unnatural complexity patterns may indicate AI."
  },
  "Coleman-Liau Index": {
    description: "Readability test based on character count rather than syllables.",
    interpretation: "Abnormal character-based complexity suggests AI."
  },
  "Automated Readability Index": {
    description: "Estimates U.S. grade level using character and word counts.",
    interpretation: "Unusual patterns compared to human writing norms."
  },
  "Dale-Chall Readability": {
    description: "Uses a list of 3000 common words to assess difficulty.",
    interpretation: "Overuse or underuse of common words may indicate AI."
  },
  "Linsear Write Formula": {
    description: "Developed for the U.S. Air Force to assess technical writing.",
    interpretation: "Inappropriate complexity for content suggests AI."
  },
  "Spache Readability": {
    description: "Designed for primary-level reading materials.",
    interpretation: "Unnatural simplicity patterns may indicate AI."
  },
  "Lexical Diversity": {
    description: "Measures vocabulary richness - ratio of unique words to total words.",
    interpretation: "Lower scores indicate more AI-like repetition and lower diversity (↑ better)."
  },
  "Syntactic Complexity": {
    description: "Analyzes sentence structure complexity using parse tree depth.",
    interpretation: "Unusual patterns in syntactic structures suggest AI generation."
  },
  "POS Tag Distribution": {
    description: "Analyzes the distribution of parts of speech (nouns, verbs, etc.).",
    interpretation: "Unnatural part-of-speech patterns indicate AI generation."
  },
  "Named Entity Density": {
    description: "Measures frequency of named entities (people, places, organizations).",
    interpretation: "Unusual entity density for content type suggests AI."
  },
  "Distribution Skewness": {
    description: "Measures asymmetry in word length distribution.",
    interpretation: "Extreme skewness may indicate AI-generated patterns."
  },
  "Distribution Kurtosis": {
    description: "Measures tailedness of word length distribution.",
    interpretation: "Unusual kurtosis suggests non-human writing patterns."
  },
  "Coefficient of Variation": {
    description: "Ratio of standard deviation to mean for word lengths.",
    interpretation: "Extreme values indicate unnatural variation patterns."
  },
  "Emotional Variance": {
    description: "Measures the diversity and range of emotional content using NRC Emotion Lexicon analysis. AI text typically has very flat emotional patterns (low variance < 0.0003).",
    interpretation: "Lower scores indicate emotionally flat content (AI-like). Higher scores suggest varied emotional expression (human-like)."
  },
  "Emotional AI Score": {
    description: "Combined AI likelihood score based on emotional flatness, minimal emotional language, balanced sentiment, and lack of dominant emotions.",
    interpretation: "Higher scores indicate AI-like emotional patterns. Low emotional word ratio (<3%) and very low variance (<0.0003) are strong AI indicators."
  },
  "Dominant Emotion": {
    description: "The most prevalent emotion detected in the text (anger, anticipation, disgust, fear, joy, sadness, surprise, trust). Based on simplified NRC Emotion Lexicon.",
    interpretation: "Neutral or no dominant emotion suggests AI generation. Human writing typically shows clear emotional bias."
  },
  "Perplexity": {
    description: "Measures text predictability using DistilGPT-2 language model. Higher perplexity indicates more surprising, creative text. Cached after first load for speed.",
    interpretation: "Higher scores indicate more surprising, creative text (human-like). Lower scores suggest predictable patterns (AI-like)."
  }
};

// Metrics where higher scores indicate LOWER AI likelihood (need inversion)
// NOTE: Only include AI-estimated metrics that come back as "higher = better quality"
// DO NOT include metrics already inverted during normalization (lexical_diversity, ngram_entropy, emotional_variance, etc.)
export const invertedMetrics = new Set([
  "Coreference Coherence",
  "Contradiction Consistency",
  "Semantic Consistency",
  "Paraphrase Robustness",
  "Temporal Consistency",
  "Round-Trip Translation Stability",
  "Order Perturbation Tolerance",
  "Perplexity",
  "Perplexity (Premium)"
]);
