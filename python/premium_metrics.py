"""
Premium Metrics Module - Paid Tier Only
Computationally expensive analysis using advanced NLP models and statistical techniques

Premium Features (justify $0.20-$0.50 pricing):
1. Perplexity Score (DistilGPT-2 model)
2. Advanced Readability Suite (9 algorithms via textstat)
3. Linguistic Complexity Analysis (POS tagging, NER, syntax via nltk)
4. Statistical Writing Fingerprint (scipy statistical analysis)

These metrics are excluded from free tier due to:
- Computational cost (transformer model inference)
- Advanced linguistic processing (POS tagging, parsing)
- Statistical complexity (distribution analysis)
"""

import sys
import json
import re
import math
from collections import Counter
import numpy as np
from scipy import stats

# Import textstat for advanced readability
import textstat

# Import nltk for linguistic analysis
import nltk
from nltk import word_tokenize, pos_tag, ne_chunk
from nltk.tree import Tree

# Download required NLTK data
required_nltk_data = [
    ('tokenizers/punkt', 'punkt'),
    ('tokenizers/punkt_tab', 'punkt_tab'),
    ('taggers/averaged_perceptron_tagger', 'averaged_perceptron_tagger'),
    ('taggers/averaged_perceptron_tagger_eng', 'averaged_perceptron_tagger_eng'),
    ('chunkers/maxent_ne_chunker', 'maxent_ne_chunker'),
    ('chunkers/maxent_ne_chunker_tab', 'maxent_ne_chunker_tab'),
    ('corpora/words', 'words'),
    ('corpora/stopwords', 'stopwords')
]

for path, name in required_nltk_data:
    try:
        nltk.data.find(path)
    except LookupError:
        try:
            nltk.download(name, quiet=True)
        except:
            pass  # Silent fail for optional data

# Import perplexity from metrics.py (reuse existing implementation)
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrics import calculate_perplexity


# ============================================================================
# PREMIUM METRIC 1: PERPLEXITY SCORE (DistilGPT-2 Model)
# ============================================================================

def calculate_premium_perplexity(text):
    """
    Calculate perplexity using DistilGPT-2 model (82M parameters).
    Lower perplexity = more predictable = more AI-like
    
    Returns: 0-100 score where higher = more AI-like
    """
    try:
        # Reuse existing perplexity implementation from metrics.py
        return calculate_perplexity(text)
    except Exception as e:
        print(f"Error calculating perplexity: {e}", file=sys.stderr)
        return 50  # Neutral fallback


# ============================================================================
# PREMIUM METRIC 2: ADVANCED READABILITY SUITE (9 Algorithms)
# ============================================================================

def calculate_advanced_readability(text):
    """
    Calculate 9 different readability scores using textstat library.
    Free tier gets only 1 basic readability score.
    
    Returns: dict with 9 readability metrics + interpretation
    """
    try:
        metrics = {
            'flesch_reading_ease': round(textstat.flesch_reading_ease(text), 2),
            'flesch_kincaid_grade': round(textstat.flesch_kincaid_grade(text), 2),
            'gunning_fog': round(textstat.gunning_fog(text), 2),
            'smog_index': round(textstat.smog_index(text), 2),
            'coleman_liau_index': round(textstat.coleman_liau_index(text), 2),
            'automated_readability_index': round(textstat.automated_readability_index(text), 2),
            'dale_chall_readability': round(textstat.dale_chall_readability_score(text), 2),
            'difficult_words': textstat.difficult_words(text),
            'linsear_write_formula': round(textstat.linsear_write_formula(text), 2),
        }
        
        # Add grade level interpretation
        avg_grade = np.mean([
            metrics['flesch_kincaid_grade'],
            metrics['gunning_fog'],
            metrics['smog_index'],
            metrics['coleman_liau_index'],
            metrics['automated_readability_index']
        ])
        
        metrics['average_grade_level'] = round(avg_grade, 1)
        
        # Interpret grade level
        if avg_grade < 6:
            metrics['readability_level'] = 'Elementary'
        elif avg_grade < 9:
            metrics['readability_level'] = 'Middle School'
        elif avg_grade < 13:
            metrics['readability_level'] = 'High School'
        elif avg_grade < 16:
            metrics['readability_level'] = 'College'
        else:
            metrics['readability_level'] = 'Graduate'
        
        return metrics
        
    except Exception as e:
        print(f"Error calculating readability: {e}", file=sys.stderr)
        return {
            'error': str(e),
            'flesch_reading_ease': 50,
            'average_grade_level': 10,
            'readability_level': 'Unknown'
        }


# ============================================================================
# PREMIUM METRIC 3: LINGUISTIC COMPLEXITY ANALYSIS (NLTK)
# ============================================================================

def calculate_tree_depth(tree, current_depth=0):
    """Recursively calculate maximum depth of parse tree"""
    if isinstance(tree, Tree):
        depths = [calculate_tree_depth(child, current_depth + 1) for child in tree]
        return max(depths) if depths else current_depth
    else:
        return current_depth


def calculate_linguistic_complexity(text):
    """
    Analyze linguistic complexity using NLTK:
    - Part-of-speech distribution
    - Named entity recognition
    - Syntactic tree depth
    - Lexical diversity
    - Noun/verb ratios
    
    Returns: dict with linguistic metrics
    """
    try:
        # Tokenize and POS tag
        words = word_tokenize(text.lower())
        tokens = word_tokenize(text)  # Case-sensitive for NER
        pos_tags = pos_tag(tokens)
        
        if len(words) < 5:
            return {'error': 'Text too short for linguistic analysis'}
        
        # POS distribution
        pos_counts = Counter([tag for word, tag in pos_tags])
        total_pos = sum(pos_counts.values())
        pos_distribution = {tag: round(count / total_pos * 100, 2) 
                           for tag, count in pos_counts.most_common(10)}
        
        # Named Entity Recognition
        try:
            tree = ne_chunk(pos_tags)
            named_entities = []
            entity_types = Counter()
            
            for chunk in tree:
                if hasattr(chunk, 'label'):
                    entity = ' '.join(c[0] for c in chunk)
                    entity_type = chunk.label()
                    named_entities.append({'text': entity, 'type': entity_type})
                    entity_types[entity_type] += 1
            
            # Calculate tree depth (syntactic complexity)
            tree_depth = calculate_tree_depth(tree)
            
        except Exception as e:
            named_entities = []
            entity_types = Counter()
            tree_depth = 0
        
        # Lexical diversity (Type-Token Ratio)
        unique_words = len(set(words))
        total_words = len(words)
        lexical_diversity = round(unique_words / total_words, 4)
        
        # POS ratios (linguistic complexity indicators)
        noun_count = sum(count for tag, count in pos_counts.items() if tag.startswith('NN'))
        verb_count = sum(count for tag, count in pos_counts.items() if tag.startswith('VB'))
        adj_count = sum(count for tag, count in pos_counts.items() if tag.startswith('JJ'))
        adv_count = sum(count for tag, count in pos_counts.items() if tag.startswith('RB'))
        
        noun_verb_ratio = round(noun_count / (verb_count + 1), 3)
        adj_noun_ratio = round(adj_count / (noun_count + 1), 3)
        
        # AI detection insight: AI text tends to have:
        # - Higher noun/verb ratio (more descriptive, less action)
        # - Lower lexical diversity (repetitive vocabulary)
        # - More uniform POS distribution
        
        return {
            'pos_distribution': pos_distribution,
            'named_entity_count': len(named_entities),
            'entity_types': dict(entity_types),
            'syntactic_complexity': tree_depth,
            'lexical_diversity': lexical_diversity,
            'noun_verb_ratio': noun_verb_ratio,
            'adj_noun_ratio': adj_noun_ratio,
            'total_words': total_words,
            'unique_words': unique_words,
            'ai_indicators': {
                'high_noun_verb_ratio': noun_verb_ratio > 2.5,  # AI tends to be noun-heavy
                'low_lexical_diversity': lexical_diversity < 0.4,  # AI repeats words
                'uniform_pos': len(pos_distribution) < 8  # AI uses fewer POS types
            }
        }
        
    except Exception as e:
        print(f"Error in linguistic analysis: {e}", file=sys.stderr)
        return {'error': str(e)}


# ============================================================================
# PREMIUM METRIC 4: STATISTICAL WRITING FINGERPRINT (scipy)
# ============================================================================

def calculate_statistical_fingerprint(text):
    """
    Advanced statistical analysis of writing style using scipy.
    Analyzes sentence length distribution, word length patterns, etc.

    Human writing has distinct statistical signatures:
    - Moderate skewness (mix of short and long sentences)
    - Higher variance (more creative)
    - Irregular patterns

    AI writing tends toward:
    - Normal distribution (less skew)
    - Lower variance (more consistent)
    - Predictable patterns

    Returns: dict with statistical metrics
    """
    try:
        # Split into sentences
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]

        if len(sentences) < 3:
            return {'error': 'Too few sentences for statistical analysis'}

        # Sentence lengths (in words)
        sentence_lengths = [len(s.split()) for s in sentences]

        # Word lengths
        words = text.split()
        word_lengths = [len(w) for w in words]

        # Character-level irregularities analysis
        # Analyze character frequency patterns that differ between human and AI text
        char_freq = Counter(text.lower())
        total_chars = sum(char_freq.values())

        # Calculate entropy of character distribution
        char_entropy = 0
        for count in char_freq.values():
            p = count / total_chars
            if p > 0:
                char_entropy -= p * math.log2(p)

        # Measure character pattern irregularity
        # AI text tends to have more regular character patterns
        char_bigrams = [text[i:i+2] for i in range(len(text)-1)]
        bigram_freq = Counter(char_bigrams)
        bigram_values = list(bigram_freq.values())

        # Higher variation in bigram frequencies indicates more human-like irregularity
        if len(bigram_values) > 1:
            bigram_cv = np.std(bigram_values) / (np.mean(bigram_values) + 1e-6)
            # Convert to 0-100 scale (higher = more irregular = more human-like)
            character_irregularities = min(100, round(bigram_cv * 30))
        else:
            character_irregularities = 50  # Default neutral score

        # Calculate statistical measures
        metrics = {
            # Sentence length statistics
            'sentence_length_mean': round(np.mean(sentence_lengths), 2),
            'sentence_length_median': round(np.median(sentence_lengths), 2),
            'sentence_length_std': round(np.std(sentence_lengths), 2),
            'sentence_length_skewness': round(stats.skew(sentence_lengths), 3),
            'sentence_length_kurtosis': round(stats.kurtosis(sentence_lengths), 3),

            # Word length statistics
            'word_length_mean': round(np.mean(word_lengths), 2),
            'word_length_std': round(np.std(word_lengths), 2),

            # Variability measures
            'coefficient_of_variation': round(np.std(sentence_lengths) / (np.mean(sentence_lengths) + 1e-6), 3),
            'median_absolute_deviation': round(stats.median_abs_deviation(sentence_lengths), 2),
            'quartile_dispersion': round(
                np.percentile(sentence_lengths, 75) - np.percentile(sentence_lengths, 25), 2
            ),

            # Range metrics
            'sentence_length_range': max(sentence_lengths) - min(sentence_lengths),
            'min_sentence_length': min(sentence_lengths),
            'max_sentence_length': max(sentence_lengths),

            # Character-level analysis
            'character_entropy': round(char_entropy, 3),
            'character_irregularities': character_irregularities,
        }
        
        # AI detection indicators
        # AI tends to have:
        # - Low skewness (near 0 = symmetric distribution)
        # - Low kurtosis (near 0 = normal distribution)
        # - Low coefficient of variation (consistent lengths)
        
        ai_score = 0
        indicators = []
        
        if abs(metrics['sentence_length_skewness']) < 0.3:
            ai_score += 25
            indicators.append('Low skewness (symmetric distribution)')
        
        if abs(metrics['sentence_length_kurtosis']) < 0.5:
            ai_score += 25
            indicators.append('Low kurtosis (normal distribution)')
        
        if metrics['coefficient_of_variation'] < 0.4:
            ai_score += 25
            indicators.append('Low variation (consistent lengths)')
        
        if metrics['sentence_length_range'] < 15:
            ai_score += 25
            indicators.append('Narrow range (uniform sentence lengths)')
        
        metrics['ai_likelihood_from_stats'] = ai_score
        metrics['ai_indicators'] = indicators
        
        return metrics
        
    except Exception as e:
        print(f"Error in statistical fingerprint: {e}", file=sys.stderr)
        return {'error': str(e)}


# ============================================================================
# MAIN FUNCTION: Calculate ALL Premium Metrics
# ============================================================================

def calculate_all_premium_metrics(text):
    """
    Calculate all premium metrics for paid tier analysis.
    
    Args:
        text (str): Content to analyze
        
    Returns:
        dict: All premium metrics organized by category
    """
    try:
        results = {
            # Premium Metric 1: Perplexity
            'perplexity': calculate_premium_perplexity(text),
            
            # Premium Metric 2: Advanced Readability
            'readability': calculate_advanced_readability(text),
            
            # Premium Metric 3: Linguistic Complexity
            'linguistics': calculate_linguistic_complexity(text),
            
            # Premium Metric 4: Statistical Fingerprint
            'statistics': calculate_statistical_fingerprint(text),
            
            # Metadata
            'metadata': {
                'tier': 'premium',
                'metrics_count': 4,
                'description': 'Computationally expensive analysis with ML models and advanced NLP',
                'cost_justification': 'Requires transformer inference, POS tagging, and statistical analysis'
            }
        }
        
        return results
        
    except Exception as e:
        print(f"Error calculating premium metrics: {e}", file=sys.stderr)
        return {
            'error': str(e),
            'metadata': {
                'tier': 'premium',
                'status': 'failed'
            }
        }


# ============================================================================
# CLI Interface
# ============================================================================

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == '--stdin':
            # Production: read from stdin
            text = sys.stdin.read()
        else:
            # Test: use command-line argument
            text = ' '.join(sys.argv[1:])
    else:
        # Test with sample text
        text = """
        Artificial intelligence has revolutionized modern technology in numerous ways. 
        Machine learning algorithms process vast amounts of data with remarkable efficiency. 
        These systems demonstrate capabilities that were once thought impossible. 
        However, concerns about AI safety and ethics remain paramount. 
        Researchers continue to explore new frontiers in neural network architectures.
        The future of AI holds both promise and uncertainty for humanity.
        """
    
    # Calculate all premium metrics
    import time
    start_time = time.time()
    
    results = calculate_all_premium_metrics(text)
    
    compute_time = round((time.time() - start_time) * 1000, 2)
    results['computeTime'] = f'{compute_time}ms'
    
    # Output as JSON
    print(json.dumps(results, indent=2))
