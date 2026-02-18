"""
Emotion Analysis Module
Uses full NRC Emotion Lexicon (6,468 words)
Based on National Research Council Canada's emotion lexicon
"""

import sys
import json
import re
import os
from collections import Counter
import math

# Load full NRC Emotion Lexicon
def load_nrc_lexicon():
    """Load the full NRC emotion lexicon from JSON file"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    lexicon_path = os.path.join(script_dir, 'nrc_lexicon.json')

    try:
        with open(lexicon_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: NRC lexicon not found at {lexicon_path}", file=sys.stderr)
        print("Using minimal fallback lexicon", file=sys.stderr)
        # Minimal fallback
        return {
            'happy': ['joy', 'positive'],
            'sad': ['sadness', 'negative'],
            'angry': ['anger', 'negative'],
            'afraid': ['fear', 'negative']
        }

# Load the lexicon at module initialization
EMOTION_LEXICON = load_nrc_lexicon()

# Negation words that flip sentiment
NEGATION_WORDS = {'not', 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'hardly', 'barely', 'scarcely'}


def analyze_emotions(text):
    """
    Analyze text for emotional content using simplified lexicon approach

    Args:
        text (str): Text to analyze

    Returns:
        dict: Emotion scores and metrics
    """
    # Clean and tokenize
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    if len(words) < 5:
        return {
            'error': 'Text too short for emotion analysis',
            'emotions': {},
            'sentiment': {},
            'emotional_variance': 0,
            'emotional_word_ratio': 0,
            'dominant_emotion': 'none',
            'ai_indicator_score': 50,
            'ai_indicators': ['Text too short for analysis'],
            'total_emotional_words': 0,
            'word_count': len(words)
        }

    # Count emotion occurrences
    emotion_counts = {
        'anger': 0,
        'anticipation': 0,
        'disgust': 0,
        'fear': 0,
        'joy': 0,
        'sadness': 0,
        'surprise': 0,
        'trust': 0
    }

    sentiment_counts = {
        'positive': 0,
        'negative': 0
    }

    total_emotional_words = 0

    # Analyze with simple negation handling
    for i, word in enumerate(words):
        if word in EMOTION_LEXICON:
            # Check for negation in previous 2 words
            is_negated = False
            for j in range(max(0, i-2), i):
                if words[j] in NEGATION_WORDS:
                    is_negated = True
                    break

            emotions = EMOTION_LEXICON[word]

            # If negated, flip sentiment but keep base emotion
            for emotion in emotions:
                if emotion == 'positive' and is_negated:
                    sentiment_counts['negative'] += 1
                elif emotion == 'negative' and is_negated:
                    sentiment_counts['positive'] += 1
                elif emotion in emotion_counts:
                    # Don't count if negated (except sentiment already handled)
                    if not is_negated:
                        emotion_counts[emotion] += 1
                elif emotion in sentiment_counts and not is_negated:
                    sentiment_counts[emotion] += 1

            total_emotional_words += 1

    # Normalize to frequencies (0-1 scale)
    word_count = len(words)

    emotions_normalized = {}
    for emotion, count in emotion_counts.items():
        emotions_normalized[emotion] = round(count / word_count, 4)

    sentiment_normalized = {}
    for sentiment, count in sentiment_counts.items():
        sentiment_normalized[sentiment] = round(count / word_count, 4)

    # Calculate emotional variance (key AI indicator)
    # AI text tends to have very flat emotions (low variance)
    emotion_values = list(emotions_normalized.values())
    if len(emotion_values) > 0 and max(emotion_values) > 0:
        mean_emotion = sum(emotion_values) / len(emotion_values)
        variance = sum((x - mean_emotion) ** 2 for x in emotion_values) / len(emotion_values)
        emotional_variance = round(variance, 4)
    else:
        emotional_variance = 0

    # Find dominant emotion
    if max(emotion_counts.values()) > 0:
        dominant_emotion = max(emotion_counts, key=emotion_counts.get)
    else:
        dominant_emotion = 'neutral'

    # Calculate AI indicator score based on emotional flatness
    # AI text typically has:
    # 1. Low emotional variance (< 0.0005)
    # 2. Few emotional words overall (< 5% of text)
    # 3. Neutral or balanced sentiment

    emotional_word_ratio = total_emotional_words / word_count if word_count > 0 else 0

    ai_indicators = []
    ai_score = 0

    # Low emotional variance suggests AI
    if emotional_variance < 0.0003:
        ai_score += 35
        ai_indicators.append('Very low emotional variance')
    elif emotional_variance < 0.001:
        ai_score += 20
        ai_indicators.append('Low emotional variance')

    # Few emotional words suggests AI (or very technical text)
    if emotional_word_ratio < 0.03:
        ai_score += 30
        ai_indicators.append('Minimal emotional language')
    elif emotional_word_ratio < 0.05:
        ai_score += 15
        ai_indicators.append('Low emotional language')

    # Very balanced sentiment suggests AI
    sentiment_diff = abs(sentiment_normalized.get('positive', 0) - sentiment_normalized.get('negative', 0))
    if sentiment_diff < 0.01 and (sentiment_normalized.get('positive', 0) > 0 or sentiment_normalized.get('negative', 0) > 0):
        ai_score += 20
        ai_indicators.append('Perfectly balanced sentiment')

    # No dominant emotion suggests AI
    if max(emotion_counts.values()) == 0:
        ai_score += 15
        ai_indicators.append('No emotional content detected')

    return {
        'emotions': emotions_normalized,
        'sentiment': sentiment_normalized,
        'emotional_variance': emotional_variance,
        'emotional_word_ratio': round(emotional_word_ratio, 4),
        'dominant_emotion': dominant_emotion,
        'ai_indicator_score': min(100, ai_score),
        'ai_indicators': ai_indicators,
        'total_emotional_words': total_emotional_words,
        'word_count': word_count
    }


# CLI interface for testing
if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '--stdin':
            text = sys.stdin.read()
        else:
            text = ' '.join(sys.argv[1:])
    else:
        # Test with sample text
        text = """
        I am excited to announce that our team has successfully completed the project.
        We faced many challenges, but our trust in each other and confident approach
        led us to this wonderful achievement. I'm happy with the results!
        """

    results = analyze_emotions(text)
    print(json.dumps(results, indent=2))
