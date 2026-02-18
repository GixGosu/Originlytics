"""
Build NRC Emotion Lexicon from downloaded text file
Converts the tab-separated format to Python dictionary
"""

import json
from collections import defaultdict

def build_lexicon(input_file='NRC-Emotion-Lexicon.txt', output_file='nrc_lexicon.json'):
    """
    Parse NRC Emotion Lexicon from tab-separated format
    Format: word\temotion\tscore (0 or 1)
    """
    lexicon = defaultdict(list)

    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) != 3:
                continue

            word, emotion, score = parts

            # Only include if score is 1 (word is associated with emotion)
            if score == '1':
                # Add emotion to word's list
                if emotion not in lexicon[word]:
                    lexicon[word].append(emotion)

    # Convert defaultdict to regular dict for JSON serialization
    lexicon_dict = dict(lexicon)

    # Save as JSON for easy loading
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(lexicon_dict, f, indent=2)

    # Print statistics
    print(f"Processed {len(lexicon_dict)} unique words")

    # Count emotion associations
    emotion_counts = defaultdict(int)
    for word, emotions in lexicon_dict.items():
        for emotion in emotions:
            emotion_counts[emotion] += 1

    print("\nEmotion counts:")
    for emotion, count in sorted(emotion_counts.items()):
        print(f"  {emotion}: {count} words")

    return lexicon_dict

if __name__ == '__main__':
    build_lexicon()
