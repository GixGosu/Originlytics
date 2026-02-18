import { useState } from 'react';

interface ChunkResult {
  chunk_id: number;
  ai_likelihood: number;
  word_count: number;
  loss_a?: number;
  loss_b?: number;
  ratio?: number;
}

interface ChunkAnalysis {
  num_chunks: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  std_dev: number;
  chunks: ChunkResult[];
}

interface ModelResult {
  ai_likelihood: number;
  confidence: number;
  indicators: string[];
  model: string;
  note: string;
  chunk_analysis?: ChunkAnalysis;
}

interface IndividualResults {
  roberta?: ModelResult;
  binoculars?: ModelResult;
}

interface ModelAnalysisSectionProps {
  individualResults: IndividualResults;
  theme: string;
}

export function ModelAnalysisSection({ individualResults, theme }: ModelAnalysisSectionProps) {
  const [expandedRoberta, setExpandedRoberta] = useState(false);
  const [expandedBinoculars, setExpandedBinoculars] = useState(false);

  if (!individualResults || (!individualResults.roberta && !individualResults.binoculars)) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme === 'dark' ? '#ef4444' : '#dc2626';
    if (score >= 60) return theme === 'dark' ? '#f97316' : '#ea580c';
    if (score >= 40) return theme === 'dark' ? '#eab308' : '#ca8a04';
    if (score >= 20) return theme === 'dark' ? '#22c55e' : '#16a34a';
    return theme === 'dark' ? '#10b981' : '#059669';
  };

  const renderChunkAnalysis = (chunkAnalysis: ChunkAnalysis | undefined, _modelName: string, isExpanded: boolean) => {
    if (!chunkAnalysis) return null;

    const { chunks, avg_score, min_score, max_score, std_dev } = chunkAnalysis;

    return (
      <div style={{ marginTop: 12 }}>
        {/* Summary Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 12,
          marginBottom: 16
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Chunks</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{chunks.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Average</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: getScoreColor(avg_score) }}>
              {avg_score.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Range</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {min_score.toFixed(0)}-{max_score.toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>Std Dev</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {std_dev.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Chunk Breakdown */}
        {isExpanded && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
              Individual Chunks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chunks.map((chunk) => (
                <div
                  key={chunk.chunk_id}
                  style={{
                    padding: 12,
                    background: 'var(--hover)',
                    borderRadius: 8,
                    border: 'var(--hairline)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                      Chunk {chunk.chunk_id + 1}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: getScoreColor(chunk.ai_likelihood) }}>
                      {chunk.ai_likelihood.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    marginBottom: 6
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${chunk.ai_likelihood}%`,
                      background: getScoreColor(chunk.ai_likelihood),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
                    <span>{chunk.word_count} words</span>
                    {chunk.loss_a !== undefined && chunk.loss_b !== undefined && (
                      <span>Loss: {chunk.loss_a.toFixed(2)} / {chunk.loss_b.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
        🔬 Detailed Model Analysis
      </div>

      {/* RoBERTa Section */}
      {individualResults.roberta && (
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 20,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                🤖 RoBERTa AI Detector
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                Hello-SimpleAI/chatgpt-detector-roberta (88% accuracy)
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(individualResults.roberta.ai_likelihood) }}>
              {individualResults.roberta.ai_likelihood.toFixed(1)}%
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
            {individualResults.roberta.note}
          </div>

          {individualResults.roberta.indicators && individualResults.roberta.indicators.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
                Detection Indicators
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {individualResults.roberta.indicators.map((indicator, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: 'var(--text-dim)', paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                    • {indicator}
                  </div>
                ))}
              </div>
            </div>
          )}

          {individualResults.roberta.chunk_analysis && (
            <>
              {renderChunkAnalysis(individualResults.roberta.chunk_analysis, 'RoBERTa', expandedRoberta)}

              <button
                onClick={() => setExpandedRoberta(!expandedRoberta)}
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
                {expandedRoberta ? 'Hide Chunk Details' : `Show ${individualResults.roberta.chunk_analysis.chunks.length} Chunks`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Binoculars Section */}
      {individualResults.binoculars && (
        <div className="card" style={{
          border: 'var(--hairline)',
          borderRadius: 16,
          padding: 20,
          background: 'var(--card)',
          boxShadow: 'var(--shadow-1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                👁️ Binoculars Perplexity Detector
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                GPT-2 vs GPT-Neo-125M comparison (90% accuracy)
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(individualResults.binoculars.ai_likelihood) }}>
              {individualResults.binoculars.ai_likelihood.toFixed(1)}%
            </div>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
            {individualResults.binoculars.note}
          </div>

          {individualResults.binoculars.indicators && individualResults.binoculars.indicators.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
                Detection Indicators
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {individualResults.binoculars.indicators.map((indicator, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: 'var(--text-dim)', paddingLeft: 12, borderLeft: '2px solid var(--border)' }}>
                    • {indicator}
                  </div>
                ))}
              </div>
            </div>
          )}

          {individualResults.binoculars.chunk_analysis && (
            <>
              {renderChunkAnalysis(individualResults.binoculars.chunk_analysis, 'Binoculars', expandedBinoculars)}

              <button
                onClick={() => setExpandedBinoculars(!expandedBinoculars)}
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
                {expandedBinoculars ? 'Hide Chunk Details' : `Show ${individualResults.binoculars.chunk_analysis.chunks.length} Chunks`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
