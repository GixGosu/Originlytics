#!/usr/bin/env python3
"""
Quick AI Detection - Statistical Heuristics Only
Target: < 500ms execution time

This script is optimized for speed by:
1. No model loading (pure Python)
2. Minimal imports
3. Simple statistical analysis
"""

import sys
import json
import statistics
from collections import Counter


def detect_ai_quick(text):
    """
    Fast AI detection using statistical patterns only.

    Returns:
        dict: {
            'ai_likelihood': int (0-100),
            'confidence': float (0-1),
            'indicators': list[str],
            'model': str
        }
    """
    try:
        score = 0
        indicators = []

        # Normalize text
        text = text.strip()
        words = text.lower().split()
        sentences = [s.strip() for s in text.split('.') if s.strip()]

        if len(words) < 50:
            return {
                'ai_likelihood': 50,
                'confidence': 0.3,
                'indicators': ['Insufficient text for analysis'],
                'model': 'statistical_heuristics_quick'
            }

        # ===== CHECK 1: Sentence length uniformity (AI loves uniform sentences) =====
        # Weight: 30 points
        if len(sentences) > 3:
            lengths = [len(s.split()) for s in sentences if s]
            if lengths and len(lengths) > 1:
                mean_len = statistics.mean(lengths)
                if mean_len > 0:
                    stdev = statistics.stdev(lengths) if len(lengths) > 1 else 0
                    cv = stdev / mean_len  # Coefficient of variation
                    if cv < 0.3:
                        score += 30
                        indicators.append("Uniform sentence lengths")
                    elif cv < 0.4:
                        score += 15
                        indicators.append("Somewhat uniform sentence lengths")

        # ===== CHECK 2: Repetitive sentence starters =====
        # Weight: 25 points
        if len(sentences) > 3:
            starts = []
            for s in sentences:
                words_in_s = s.split()
                if words_in_s:
                    starts.append(words_in_s[0].lower())

            if starts:
                freq = Counter(starts)
                unique_ratio = len(freq) / len(starts)
                if unique_ratio < 0.5:
                    score += 25
                    indicators.append("Repetitive sentence starters")
                elif unique_ratio < 0.6:
                    score += 12
                    indicators.append("Some repetitive starters")

        # ===== CHECK 3: Lack of personal pronouns =====
        # Weight: 20 points
        personal_pronouns = {'i', 'me', 'my', 'mine', 'myself', 'we', 'us', 'our', 'ours', 'ourselves'}
        pronoun_count = sum(1 for w in words if w in personal_pronouns)
        pronoun_ratio = pronoun_count / len(words) if words else 0

        if pronoun_ratio < 0.005:  # Less than 0.5%
            score += 20
            indicators.append("No personal pronouns")
        elif pronoun_ratio < 0.01:  # Less than 1%
            score += 10
            indicators.append("Few personal pronouns")

        # ===== CHECK 4: Excessive transitional phrases =====
        # Weight: 15 points
        transitions = {
            'furthermore', 'moreover', 'additionally', 'consequently',
            'therefore', 'thus', 'hence', 'accordingly', 'nonetheless',
            'nevertheless', 'subsequently', 'specifically', 'particularly',
            'essentially', 'fundamentally', 'significantly', 'notably'
        }
        transition_count = sum(1 for w in words if w in transitions)
        transition_ratio = transition_count / len(words) if words else 0

        if transition_ratio > 0.02:  # More than 2%
            score += 15
            indicators.append("High transitional phrase density")
        elif transition_ratio > 0.01:
            score += 8
            indicators.append("Elevated transitional phrases")

        # ===== CHECK 5: Lack of contractions =====
        # Weight: 10 points
        contractions = ["n't", "'ll", "'ve", "'re", "'m", "'d", "'s"]
        has_contractions = any(c in text for c in contractions)

        if not has_contractions and len(words) > 100:
            score += 10
            indicators.append("No contractions used")

        # ===== CHECK 6: Vocabulary diversity (Type-Token Ratio) =====
        # Weight: 10 points (bonus check)
        unique_words = set(words)
        ttr = len(unique_words) / len(words) if words else 0

        # AI text often has lower vocabulary diversity in longer texts
        if len(words) > 200 and ttr < 0.4:
            score += 10
            indicators.append("Low vocabulary diversity")

        # Cap score at 100
        final_score = min(100, score)

        # Calculate confidence based on text length and indicator count
        base_confidence = 0.5
        length_bonus = min(0.2, len(words) / 1000)  # Up to 0.2 for 1000+ words
        indicator_bonus = min(0.2, len(indicators) * 0.05)  # Up to 0.2 for 4+ indicators
        confidence = min(0.9, base_confidence + length_bonus + indicator_bonus)

        return {
            'ai_likelihood': final_score,
            'confidence': round(confidence, 2),
            'indicators': indicators if indicators else ['No strong AI indicators detected'],
            'model': 'statistical_heuristics_quick'
        }

    except Exception as e:
        return {
            'ai_likelihood': 50,
            'confidence': 0.3,
            'indicators': [f'Analysis error: {str(e)}'],
            'model': 'statistical_heuristics_quick_error'
        }


def main():
    """Main entry point - reads from stdin, outputs JSON to stdout."""
    # Check for --stdin flag
    if '--stdin' not in sys.argv:
        print(json.dumps({
            'error': 'Usage: python ai_detector_quick.py --stdin < text_file',
            'ai_likelihood': 0,
            'confidence': 0,
            'indicators': []
        }))
        sys.exit(1)

    # Read text from stdin
    try:
        text = sys.stdin.read()
    except Exception as e:
        print(json.dumps({
            'error': f'Failed to read stdin: {str(e)}',
            'ai_likelihood': 50,
            'confidence': 0.3,
            'indicators': ['Input error']
        }))
        sys.exit(1)

    # Run detection
    result = detect_ai_quick(text)

    # Output JSON
    print(json.dumps(result))


if __name__ == '__main__':
    main()
