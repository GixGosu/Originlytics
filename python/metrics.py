"""
Real Statistical Metrics Calculator for OriginLytics
Computes actual text metrics instead of AI estimates
"""

import re
import math
from collections import Counter
import statistics

# Import emotion analyzer
from emotion_analyzer import analyze_emotions

# ============================================================================
# MODEL CACHE for Perplexity Calculation (shared with ai_detector.py pattern)
# ============================================================================
# Cache distilgpt2 model for lightweight perplexity calculation
_METRICS_MODEL_CACHE = {}

def get_cached_perplexity_model():
    """
    Load and cache distilgpt2 for perplexity calculation.

    Returns:
        tuple: (tokenizer, model, device)

    Note: Uses lightweight distilgpt2 (2x faster than gpt2)
    """
    model_name = "distilgpt2"
    if model_name not in _METRICS_MODEL_CACHE:
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM
            import torch

            # Load lightweight model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(model_name)
            model.eval()  # Evaluation mode

            # Use GPU if available
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            model = model.to(device)

            # Store in cache
            _METRICS_MODEL_CACHE[model_name] = (tokenizer, model, device)

        except Exception as e:
            raise RuntimeError(f"Failed to load perplexity model {model_name}: {e}")

    return _METRICS_MODEL_CACHE[model_name]


def calculate_perplexity(text):
    """
    Calculate text perplexity using distilgpt2 (PRIORITY 3 IMPROVEMENT).

    Perplexity measures how "surprising" text is to a language model:
    - Lower perplexity = more predictable = more AI-like
    - Higher perplexity = more surprising = more human-like

    Returns: 0-100 score (100 = very predictable/AI-like, 0 = very surprising/human-like)

    Performance:
        - Uses lightweight distilgpt2 (82M params vs 124M for gpt2)
        - Cached after first load (instant subsequent calls)
        - Processes up to 512 tokens for speed

    Typical Values:
        - Human casual text: perplexity 40-100 → score 20-50
        - AI-generated text: perplexity 15-40 → score 50-85
        - Very formulaic AI: perplexity 10-15 → score 85-95
    """
    try:
        # Load cached model (instant after first call)
        tokenizer, model, device = get_cached_perplexity_model()

        # Ensure text is a string and clean it
        if not isinstance(text, str):
            text = str(text)
        text = text.strip()
        
        # Tokenize with truncation for speed
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(device) for k, v in inputs.items()}

        # Calculate perplexity
        import torch
        with torch.no_grad():
            outputs = model(**inputs, labels=inputs['input_ids'])
            # Perplexity = exp(loss)
            perplexity = torch.exp(outputs.loss).item()

        # Normalize to 0-100 score
        # Lower perplexity = more predictable = higher AI likelihood score
        if perplexity < 15:
            # Very low perplexity = very AI-like (85-95 range)
            score = 95 - (perplexity - 10) * 2
        elif perplexity < 40:
            # Moderate perplexity = likely AI (50-85 range)
            score = 85 - (perplexity - 15) * 1.4
        elif perplexity < 80:
            # Higher perplexity = likely human (20-50 range)
            score = 50 - (perplexity - 40) * 0.75
        else:
            # Very high perplexity = very human-like (0-20 range)
            score = max(0, 20 - (perplexity - 80) * 0.2)

        return min(100, max(0, score))

    except ImportError:
        # transformers not installed - return neutral score
        return 50
    except Exception as e:
        # Send error to stderr to avoid breaking JSON output
        import sys
        print(f"Error calculating perplexity: {e}", file=sys.stderr)
        return 50  # Fallback to neutral score


def calculate_ngram_entropy(text, n=2):
    """
    Calculate N-gram entropy (diversity of word combinations)
    Higher entropy = more diverse, creative text (less AI-like)
    Returns: 0-100 score where HIGHER = MORE AI-like (inverted for consistency)
    """
    try:
        words = text.lower().split()
        if len(words) < n:
            return 50  # Not enough data

        # Generate n-grams
        ngrams = [tuple(words[i:i+n]) for i in range(len(words)-n+1)]

        # Calculate frequency distribution
        freq = Counter(ngrams)
        total = len(ngrams)

        # Calculate Shannon entropy
        entropy = -sum((count/total) * math.log2(count/total)
                      for count in freq.values())

        # Normalize to 0-100 scale
        # Maximum entropy for n-grams is roughly log2(total_ngrams)
        max_entropy = math.log2(total) if total > 1 else 1
        normalized = (entropy / max_entropy) * 100 if max_entropy > 0 else 50

        # INVERT: Higher entropy (diverse) = lower AI score
        # Lower entropy (repetitive) = higher AI score
        inverted = 100 - normalized

        return min(100, max(0, inverted))
    except Exception as e:
        print(f"Error calculating n-gram entropy: {e}")
        return 50


def calculate_burstiness(text):
    """
    Calculate burstiness (variance in sentence lengths)
    AI text often has uniform sentence lengths
    Returns: 0-100 score (100 = very uniform/bursty, AI-like)
    """
    try:
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 2:
            return 50
        
        # Calculate word count per sentence
        lengths = [len(s.split()) for s in sentences]

        # Calculate coefficient of variation (CV)
        mean_length = statistics.mean(lengths)
        std_length = statistics.stdev(lengths) if len(lengths) > 1 else 0
        
        if mean_length == 0:
            return 50
        
        cv = std_length / mean_length
        
        # Lower CV = more uniform = more AI-like
        # Invert so higher score = more AI-like
        # Human writing typically has CV around 0.4-0.8
        # AI writing typically has CV around 0.2-0.4
        if cv > 0.6:
            score = 20  # Very varied, likely human
        elif cv > 0.4:
            score = 40  # Moderate variation
        elif cv > 0.2:
            score = 60  # Low variation, possibly AI
        else:
            score = 80  # Very uniform, likely AI
        
        return min(100, max(0, score))
    except Exception as e:
        print(f"Error calculating burstiness: {e}")
        return 50


def calculate_readability_score(text):
    """
    Calculate readability using Flesch Reading Ease
    Extreme scores can indicate AI generation
    Returns: 0-100 score (higher = more unusual/AI-like)
    """
    try:
        from textstat import flesch_reading_ease
        
        score = flesch_reading_ease(text)
        
        # Flesch scale: 0-100 (higher = easier to read)
        # Human writing: typically 30-70
        # AI often produces text at 50-70 (optimized for readability)
        
        # Calculate deviation from human norm (50)
        deviation = abs(score - 50)
        
        # Convert to AI likelihood (higher deviation = more AI-like)
        ai_likelihood = min(100, deviation * 2)
        
        return ai_likelihood
    except Exception as e:
        print(f"Error calculating readability: {e}")
        return 50


def calculate_punctuation_uniformity(text):
    """
    Analyze punctuation patterns for uniformity
    AI often has very consistent punctuation usage
    Returns: 0-100 score (higher = more uniform/AI-like)
    """
    try:
        # Extract punctuation
        punctuation = re.findall(r'[,.!?;:]', text)
        
        if len(punctuation) < 10:
            return 50  # Not enough data
        
        # Calculate frequency of each punctuation mark
        freq = Counter(punctuation)
        total = len(punctuation)
        
        # Calculate entropy (diversity)
        entropy = -sum((count/total) * math.log2(count/total) 
                      for count in freq.values() if count > 0)
        
        # Lower entropy = more uniform = more AI-like
        max_entropy = math.log2(len(freq)) if len(freq) > 0 else 1
        uniformity = 100 - ((entropy / max_entropy) * 100 if max_entropy > 0 else 50)
        
        return min(100, max(0, uniformity))
    except Exception as e:
        print(f"Error calculating punctuation uniformity: {e}")
        return 50


def calculate_sentence_length_variance(text):
    """
    Measure variance in sentence lengths
    Similar to burstiness but more granular
    Returns: 0-100 score (100 = very uniform, AI-like)
    """
    try:
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) < 3:
            return 50
        
        lengths = [len(s.split()) for s in sentences]

        # Calculate variance
        variance = statistics.variance(lengths) if len(lengths) > 1 else 0
        mean = statistics.mean(lengths)
        
        # Normalize by mean to get relative variance
        relative_variance = variance / (mean ** 2) if mean > 0 else 0
        
        # Convert to uniformity score (lower variance = more uniform = more AI)
        # Human: relative_variance typically 0.1-0.4
        # AI: relative_variance typically 0.02-0.15
        if relative_variance > 0.3:
            score = 20  # High variance, likely human
        elif relative_variance > 0.15:
            score = 40
        elif relative_variance > 0.08:
            score = 60
        else:
            score = 80  # Very low variance, likely AI
        
        return min(100, max(0, score))
    except Exception as e:
        print(f"Error calculating sentence length variance: {e}")
        return 50


def calculate_character_irregularities(text):
    """
    Detect unusual character patterns or encoding artifacts
    AI generation sometimes produces subtle irregularities
    Returns: 0-100 score (higher = more irregularities/AI-like)
    """
    try:
        irregularities = 0
        
        # Check for excessive whitespace
        if re.search(r'\s{3,}', text):
            irregularities += 20
        
        # Check for unusual character repetition
        if re.search(r'(.)\1{4,}', text):
            irregularities += 20
        
        # Check for mixed encoding or unusual unicode
        try:
            text.encode('ascii')
        except UnicodeEncodeError:
            # Has non-ASCII, check if it's reasonable
            non_ascii = len([c for c in text if ord(c) > 127])
            if non_ascii / len(text) > 0.1:  # More than 10% non-ASCII
                irregularities += 15
        
        # Check for unusual punctuation density
        punct_count = len(re.findall(r'[^\w\s]', text))
        punct_ratio = punct_count / len(text) if len(text) > 0 else 0
        if punct_ratio > 0.15 or punct_ratio < 0.02:
            irregularities += 15
        
        return min(100, irregularities)
    except Exception as e:
        print(f"Error calculating character irregularities: {e}")
        return 0


def analyze_text_metrics(text):
    """
    Run all metric calculations and return results
    Returns: dict with all metrics (0-100 scale)
    """
    if not text or len(text.strip()) < 50:
        return {
            'error': 'Text too short for analysis',
            'metrics': {}
        }

    # Calculate all metrics and round to whole percentages (0-100)
    metrics = {
        'N-gram Entropy': round(calculate_ngram_entropy(text)),
        'Burstiness': round(calculate_burstiness(text)),
        'Sentence Length Variance': round(calculate_sentence_length_variance(text)),
        'Punctuation Pattern Uniformity': round(calculate_punctuation_uniformity(text)),
        'Readability Z-Score': round(calculate_readability_score(text)),
        'Character-Level Irregularities': round(calculate_character_irregularities(text)),
        'Perplexity': round(calculate_perplexity(text)),  # PRIORITY 3: New AI-powered metric
    }

    # Add emotional analysis
    emotion_results = None
    try:
        emotion_results = analyze_emotions(text)
        emotion_metrics = {
            'Emotional Variance': emotion_results.get('emotional_variance', 0),
            'Emotional AI Score': emotion_results.get('ai_indicator_score', 50),
            'Dominant Emotion': emotion_results.get('dominant_emotion', 'neutral'),
        }
        metrics.update(emotion_metrics)
    except Exception as e:
        print(f"Error in emotion analysis: {e}", file=sys.stderr)
        # Add default emotion metrics
        metrics['Emotional Variance'] = 0
        metrics['Emotional AI Score'] = 50
        metrics['Dominant Emotion'] = 'neutral'

    return {
        'success': True,
        'metrics': metrics,
        'emotion_details': emotion_results if emotion_results else {},
        'calculation_method': 'statistical'  # vs 'ai_estimated'
    }


if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--stdin':
            # Production: read from stdin (avoids command-line length limits)
            text = sys.stdin.read().strip()
            if not text:
                print(json.dumps({'error': 'No input text provided'}))
                sys.exit(1)
        else:
            # Backward compatibility: accept text from command line
            text = sys.argv[1]
        
        try:
            result = analyze_text_metrics(text)
            
            # Convert metric names to snake_case for Node.js
            if 'metrics' in result:
                metrics_snake = {
                    'ngram_entropy': result['metrics'].get('N-gram Entropy', 50),
                    'burstiness': result['metrics'].get('Burstiness', 50),
                    'sentence_variance': result['metrics'].get('Sentence Length Variance', 50),
                    'punctuation_uniformity': result['metrics'].get('Punctuation Pattern Uniformity', 50),
                    'readability_score': result['metrics'].get('Readability Z-Score', 50),
                    'character_irregularities': result['metrics'].get('Character-Level Irregularities', 0),
                    'perplexity': result['metrics'].get('Perplexity', 50),  # PRIORITY 3: New metric
                    'emotional_variance': result['metrics'].get('Emotional Variance', 0),
                    'emotional_ai_score': result['metrics'].get('Emotional AI Score', 50),
                    'dominant_emotion': result['metrics'].get('Dominant Emotion', 'neutral'),
                }

                # Include full emotion details if available
                if 'emotion_details' in result and result['emotion_details']:
                    metrics_snake['emotion_details'] = result['emotion_details']

                print(json.dumps(metrics_snake))
            else:
                print(json.dumps({'error': 'Analysis failed'}))
        except Exception as e:
            # Print error to stderr to avoid breaking JSON parsing
            import sys
            print(f"Error in metrics.py: {e}", file=sys.stderr)
            # Return default values so analysis can continue
            print(json.dumps({
                'ngram_entropy': 50,
                'burstiness': 50,
                'sentence_variance': 50,
                'punctuation_uniformity': 50,
                'readability_score': 50,
                'character_irregularities': 0,
                'perplexity': 50,
                'emotional_variance': 0,
                'emotional_ai_score': 50,
                'dominant_emotion': 'neutral',
                'emotion_details': {
                    'emotions': {},
                    'sentiment': {},
                    'emotional_variance': 0,
                    'emotional_word_ratio': 0,
                    'dominant_emotion': 'neutral',
                    'ai_indicator_score': 50,
                    'ai_indicators': [],
                    'total_emotional_words': 0,
                    'word_count': 0
                }
            }))
    else:
        # Test mode: run with sample text
        sample_human = """
        The quick brown fox jumps over the lazy dog. But why? 
        Nobody really knows. Some say it was hungry. Others think it was just showing off!
        Life is full of mysteries like this one.
        """
        
        sample_ai = """
        The analysis reveals several important factors. First, we observe clear patterns.
        Second, the data suggests significant trends. Third, these findings indicate notable outcomes.
        Finally, we can conclude that the results are meaningful.
        """
        
        print("Human-written text metrics:")
        print(analyze_text_metrics(sample_human))
        print("\nAI-generated text metrics:")
        print(analyze_text_metrics(sample_ai))
