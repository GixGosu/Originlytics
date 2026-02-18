export interface EmotionalAnalysis {
  emotions: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
    disgust?: number;
    trust?: number;
    anticipation?: number;
  };
  sentiment: {
    positive?: number;
    negative?: number;
    neutral?: number;
  };
  emotional_variance: number;
  emotional_word_ratio: number;
  dominant_emotion: string;
  ai_indicator_score: number;
  ai_indicators: string[];
  total_emotional_words: number;
  word_count: number;
}
