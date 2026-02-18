import { useState } from 'react';
import type { EmotionalAnalysis } from '../types/emotional';

interface EmotionalAnalysisSectionProps {
  result: EmotionalAnalysis | null;
  theme: string;
}

export function EmotionalAnalysisSection({ result, theme }: EmotionalAnalysisSectionProps) {
  const [expandedEmotions, setExpandedEmotions] = useState(false);

  // Debug logging
  console.log('EmotionalAnalysisSection result:', result);
  console.log('Emotions:', result?.emotions);
  console.log('Sentiment:', result?.sentiment);
  console.log('Total emotional words:', result?.total_emotional_words);
  console.log('Word count:', result?.word_count);

  if (!result || !result.emotions || Object.keys(result.emotions).length === 0) {
    return (
      <div className="card" style={{
        padding: 32,
        textAlign: 'center',
        color: 'var(--text-dim)',
        border: 'var(--hairline)',
        borderRadius: 16,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>
          No emotional data available
        </div>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {result && result.word_count !== undefined && result.word_count < 5
            ? 'Text content is too short for emotional analysis (minimum 5 words required)'
            : 'Analyze a URL with substantial text content to see emotional analysis'
          }
        </div>
      </div>
    );
  }

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      joy: theme === 'dark' ? '#fbbf24' : '#f59e0b',
      sadness: theme === 'dark' ? '#60a5fa' : '#3b82f6',
      anger: theme === 'dark' ? '#f87171' : '#ef4444',
      fear: theme === 'dark' ? '#a78bfa' : '#8b5cf6',
      surprise: theme === 'dark' ? '#34d399' : '#10b981',
      disgust: theme === 'dark' ? '#fb923c' : '#f97316',
      trust: theme === 'dark' ? '#22d3ee' : '#06b6d4',
      anticipation: theme === 'dark' ? '#c084fc' : '#a855f7'
    };
    return colors[emotion] || 'var(--text-dim)';
  };

  const emotionEntries = Object.entries(result.emotions || {})
    .map(([emotion, value]) => ({ emotion, value: value || 0 }))
    .sort((a, b) => b.value - a.value);

  const visibleEmotions = expandedEmotions ? emotionEntries : emotionEntries.slice(0, 4);

  const emotionalWordPercentage = Math.round((result.emotional_word_ratio || 0) * 100);
  const variance = result.emotional_variance || 0;
  const variancePercentage = Math.round(variance * 10000) / 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview Card */}
      <div className="card" style={{
        border: 'var(--hairline)',
        borderRadius: 16,
        padding: 24,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Dominant Emotion */}
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textAlign: 'left' }}>
              Dominant Emotion
            </div>
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: getEmotionColor(result.dominant_emotion),
              textTransform: 'capitalize',
              textAlign: 'left'
            }}>
              {result.dominant_emotion || 'neutral'}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textAlign: 'left' }}>
                Emotional Words
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>
                {emotionalWordPercentage}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'left' }}>
                {result.total_emotional_words} of {result.word_count}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textAlign: 'left' }}>
                Variance
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', textAlign: 'left' }}>
                {variancePercentage}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'left' }}>
                {variance < 0.0003 ? 'Very Low' : variance < 0.001 ? 'Low' : variance < 0.01 ? 'Medium' : 'High'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4, textAlign: 'left' }}>
                AI Indicator
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: result.ai_indicator_score > 60 ? '#ef4444' : '#22c55e', textAlign: 'left' }}>
                {result.ai_indicator_score}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'left' }}>
                {result.ai_indicator_score > 60 ? 'AI-like' : 'Human-like'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24
      }}>
        {/* Emotion Breakdown */}
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Emotion Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleEmotions.map(({ emotion, value }) => (
              <div key={emotion}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize', textAlign: 'left' }}>
                    {emotion}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: getEmotionColor(emotion), textAlign: 'left' }}>
                    {Math.round(value * 10000) / 100}%
                  </span>
                </div>
                <div style={{
                  height: 6,
                  background: 'var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${value * 100}%`,
                    background: getEmotionColor(emotion),
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {emotionEntries.length > 4 && (
            <button
              onClick={() => setExpandedEmotions(!expandedEmotions)}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text)',
                background: 'var(--hover)',
                border: 'var(--hairline)',
                borderRadius: 8,
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {expandedEmotions ? 'Show Less' : `Show All ${emotionEntries.length} Emotions`}
            </button>
          )}
        </div>

        {/* Sentiment Analysis */}
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            Sentiment Analysis
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(result.sentiment || {}).map(([sentiment, value]) => {
              const sentColor = sentiment === 'positive' ? '#22c55e' : sentiment === 'negative' ? '#ef4444' : '#94a3b8';
              return (
                <div key={sentiment}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize', textAlign: 'left' }}>
                      {sentiment}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: sentColor, textAlign: 'left' }}>
                      {Math.round((value || 0) * 10000) / 100}%
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(value || 0) * 100}%`,
                      background: sentColor,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Indicators */}
      {result.ai_indicators && result.ai_indicators.length > 0 && (
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 16,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
            AI Detection Indicators ({result.ai_indicators.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.ai_indicators.map((indicator, idx) => (
              <div
                key={idx}
                style={{
                  padding: 12,
                  background: 'var(--hover)',
                  borderRadius: 8,
                  borderLeft: '3px solid #ef4444'
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>
                  {indicator}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="card" style={{
        border: 'var(--hairline)',
        borderRadius: 16,
        padding: 16,
        background: 'var(--card)',
        boxShadow: 'var(--shadow-1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
          Interpretation
        </h3>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, textAlign: 'left' }}>
          {result.ai_indicator_score > 60 ? (
            <>
              <strong style={{ color: '#ef4444' }}>AI-Generated Indicators:</strong> This text shows patterns typical of AI-generated content, including {variance < 0.0003 ? 'extremely low' : 'low'} emotional variance ({variancePercentage}%) and {emotionalWordPercentage}% emotional language.
            </>
          ) : (
            <>
              <strong style={{ color: '#22c55e' }}>Human-Written Indicators:</strong> This text shows patterns typical of human writing, with varied emotional expression ({variancePercentage}% variance) and {emotionalWordPercentage}% emotional language.
            </>
          )}
          <br /><br />
          <strong>About the Analysis:</strong> This analysis uses the NRC Emotion Lexicon to detect 8 primary emotions (joy, sadness, anger, fear, surprise, disgust, trust, anticipation) and overall sentiment. AI-generated text typically shows very flat emotional patterns with low variance (&lt;0.03%) and minimal emotional language (&lt;3%).
        </div>
      </div>
    </div>
  );
}
