import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface EssayAnalysis {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  averageSentencesPerParagraph: number;
  readabilityGrade: number;
  readingLevel: string;
  estimatedReadingTime: number;
  issues: EssayIssue[];
  score: number; // Overall essay quality score 0-100
}

interface EssayIssue {
  type: 'structure' | 'readability' | 'grammar' | 'style';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export function EssayChecker() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<EssayAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Essay Checker - Check Essay Quality Online | OriginLytics';

    const setMetaTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const setPropertyTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMetaTag('description', 'Free essay checker that analyzes essay structure, readability, grammar, and style. Get instant feedback to improve your essays and academic writing.');
    setMetaTag('keywords', 'essay checker, essay grader, check my essay, essay quality, academic writing checker, essay analyzer');
    setPropertyTag('og:title', 'Free Essay Checker - Check Essay Quality Online');
    setPropertyTag('og:description', 'Analyze your essay for structure, readability, and quality. Get instant feedback and improvement suggestions.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ui.theme', newTheme);
      return newTheme;
    });
  }, []);

  const analyzeEssay = useCallback(() => {
    if (!text.trim() || wordCount < 50) {
      return;
    }

    setLoading(true);

    // Simulate analysis (in production, this could call backend API)
    setTimeout(() => {
      const result = performEssayAnalysis(text);
      setAnalysis(result);
      setLoading(false);
    }, 800);
  }, [text]);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--card)',
        borderBottom: 'var(--hairline)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          textDecoration: 'none'
        }}>
          OriginLytics
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/ai-detector" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            AI Detector
          </Link>
          <Link to="/grammar-checker" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Grammar
          </Link>
          <Link to="/readability-checker" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Readability
          </Link>
          <Link to="/citation-generator" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Citation
          </Link>
          <button
            onClick={toggleTheme}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-secondary)',
              border: 'var(--hairline)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16
            }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Free Essay Checker
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Analyze your essay's structure, readability, and quality. Get instant feedback and improvement suggestions.
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          position: 'relative',
          marginBottom: 20
        }}>
          <div style={{
            marginBottom: 8,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            Paste Your Essay
          </div>
          <div style={{
            position: 'absolute',
            top: 38,
            right: 12,
            fontSize: 12,
            color: wordCount < 50 ? 'var(--text-dim)' : '#22c55e',
            background: 'var(--bg-elev-1)',
            padding: '4px 8px',
            borderRadius: 6,
            fontWeight: 500,
            zIndex: 1
          }}>
            {wordCount} words
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your essay here for comprehensive analysis...

Minimum 50 words recommended for accurate results."
            style={{
              width: '100%',
              minHeight: 350,
              padding: '44px 20px 20px 20px',
              fontSize: 15,
              lineHeight: 1.7,
              fontFamily: 'inherit',
              backgroundColor: 'var(--card)',
              color: 'var(--text-primary)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              resize: 'vertical'
            }}
          />
        </div>

        {/* Check Button */}
        <button
          onClick={analyzeEssay}
          disabled={loading || wordCount < 50}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: loading || wordCount < 50
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || wordCount < 50 ? 'not-allowed' : 'pointer',
            boxShadow: loading || wordCount < 50 ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)',
            opacity: loading || wordCount < 50 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {loading ? 'Analyzing Essay...' : wordCount < 50 ? 'Enter at least 50 words' : 'Check Essay'}
        </button>

        {/* Results */}
        {analysis && (
          <>
            {/* Overall Score */}
            <div style={{
              backgroundColor: 'var(--card)',
              borderRadius: 16,
              padding: 32,
              marginBottom: 24,
              textAlign: 'center',
              border: '2px solid var(--accent)'
            }}>
              <div style={{
                fontSize: 72,
                fontWeight: 800,
                color: getScoreColor(analysis.score),
                marginBottom: 8
              }}>
                {analysis.score}
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8
              }}>
                {getScoreLabel(analysis.score)}
              </div>
              <div style={{
                fontSize: 14,
                color: 'var(--text-dim)'
              }}>
                Overall Essay Quality Score
              </div>
            </div>

            {/* Statistics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}>
              <StatCard
                icon="📝"
                label="Words"
                value={analysis.wordCount}
              />
              <StatCard
                icon="📄"
                label="Sentences"
                value={analysis.sentenceCount}
              />
              <StatCard
                icon="📋"
                label="Paragraphs"
                value={analysis.paragraphCount}
              />
              <StatCard
                icon="📊"
                label="Avg Words/Sentence"
                value={analysis.averageWordsPerSentence.toFixed(1)}
              />
              <StatCard
                icon="🎓"
                label="Reading Level"
                value={analysis.readingLevel}
              />
              <StatCard
                icon="⏱️"
                label="Reading Time"
                value={`${analysis.estimatedReadingTime}m`}
              />
            </div>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <div style={{
                backgroundColor: 'var(--card)',
                borderRadius: 16,
                padding: 24,
                marginBottom: 24
              }}>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: 'var(--text-primary)'
                }}>
                  Suggestions for Improvement ({analysis.issues.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {analysis.issues.map((issue, index) => (
                    <IssueCard key={index} issue={issue} />
                  ))}
                </div>
              </div>
            )}

            {/* Analysis Details */}
            <div style={{
              backgroundColor: 'var(--card)',
              borderRadius: 16,
              padding: 24
            }}>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 20,
                color: 'var(--text-primary)'
              }}>
                Essay Analysis Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <DetailRow
                  label="Average Sentence Length"
                  value={`${analysis.averageWordsPerSentence.toFixed(1)} words`}
                  recommendation="Aim for 15-20 words per sentence for optimal readability"
                  status={analysis.averageWordsPerSentence >= 15 && analysis.averageWordsPerSentence <= 20 ? 'good' : 'warning'}
                />
                <DetailRow
                  label="Paragraph Structure"
                  value={`${analysis.averageSentencesPerParagraph.toFixed(1)} sentences per paragraph`}
                  recommendation="Keep paragraphs between 3-5 sentences for academic essays"
                  status={analysis.averageSentencesPerParagraph >= 3 && analysis.averageSentencesPerParagraph <= 5 ? 'good' : 'warning'}
                />
                <DetailRow
                  label="Readability Grade"
                  value={`Grade ${analysis.readabilityGrade.toFixed(1)}`}
                  recommendation="Most academic essays should be at 9th-12th grade level"
                  status={analysis.readabilityGrade >= 9 && analysis.readabilityGrade <= 12 ? 'good' : 'warning'}
                />
              </div>
            </div>
          </>
        )}

        {/* SEO Content */}
        <div style={{
          marginTop: 48,
          padding: 32,
          backgroundColor: 'var(--card)',
          borderRadius: 20
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 16,
            color: 'var(--text-primary)'
          }}>
            How the Essay Checker Works
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            marginBottom: 16
          }}>
            Our essay checker analyzes multiple aspects of your essay to provide comprehensive feedback:
          </p>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Structure Analysis
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Examines paragraph organization, sentence variety, and overall essay flow.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Readability Check
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Calculates reading level to ensure your essay is appropriate for your target audience.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Quality Score
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Provides an overall score based on structure, readability, and academic writing best practices.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '24px 20px',
        textAlign: 'center',
        borderTop: 'var(--hairline)',
        marginTop: 48
      }}>
        <p style={{
          fontSize: 13,
          color: 'var(--text-dim)'
        }}>
          © {new Date().getFullYear()} OriginLytics. All rights reserved.
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 12,
          flexWrap: 'wrap'
        }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Home</Link>
          <Link to="/ai-detector" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>AI Detector</Link>
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/readability-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Readability Checker</Link>
          <Link to="/citation-generator" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Citation Generator</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div style={{
      padding: 20,
      backgroundColor: 'var(--card)',
      borderRadius: 12,
      border: 'var(--hairline)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        {label}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: EssayIssue }) {
  const severityColors = {
    low: '#3b82f6',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  const typeIcons = {
    structure: '📋',
    readability: '📖',
    grammar: '✏️',
    style: '🎨'
  };

  return (
    <div style={{
      padding: 16,
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 12,
      borderLeft: `4px solid ${severityColors[issue.severity]}`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }}>
        <span style={{ fontSize: 20 }}>{typeIcons[issue.type]}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: severityColors[issue.severity],
            textTransform: 'uppercase',
            marginBottom: 4
          }}>
            {issue.type} - {issue.severity} priority
          </div>
          <div style={{
            fontSize: 14,
            color: 'var(--text-primary)',
            marginBottom: 8,
            fontWeight: 500
          }}>
            {issue.message}
          </div>
          <div style={{
            fontSize: 13,
            color: 'var(--text-dim)',
            fontStyle: 'italic'
          }}>
            💡 {issue.suggestion}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, recommendation, status }: {
  label: string;
  value: string;
  recommendation: string;
  status: 'good' | 'warning';
}) {
  return (
    <div style={{
      padding: 16,
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 12
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: status === 'good' ? '#22c55e' : '#f59e0b'
        }}>
          {value} {status === 'good' ? '✓' : '⚠️'}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        {recommendation}
      </div>
    </div>
  );
}

// Essay analysis function
function performEssayAnalysis(text: string): EssayAnalysis {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length || 1;

  const averageWordsPerSentence = wordCount / sentenceCount;
  const averageSentencesPerParagraph = sentenceCount / paragraphCount;

  // Simple readability calculation (Flesch-Kincaid approximation)
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const readabilityGrade = Math.max(0, 0.39 * averageWordsPerSentence + 11.8 * (syllables / wordCount) - 15.59);

  let readingLevel = 'Elementary';
  if (readabilityGrade >= 13) readingLevel = 'College';
  else if (readabilityGrade >= 9) readingLevel = 'High School';
  else if (readabilityGrade >= 6) readingLevel = 'Middle School';

  const estimatedReadingTime = Math.ceil(wordCount / 200);

  // Generate issues based on analysis
  const issues: EssayIssue[] = [];

  if (averageWordsPerSentence < 10) {
    issues.push({
      type: 'readability',
      severity: 'medium',
      message: 'Sentences are too short on average',
      suggestion: 'Combine related ideas into longer sentences for better flow'
    });
  } else if (averageWordsPerSentence > 25) {
    issues.push({
      type: 'readability',
      severity: 'high',
      message: 'Sentences are too long on average',
      suggestion: 'Break down complex sentences into shorter ones for clarity'
    });
  }

  if (paragraphCount < 3) {
    issues.push({
      type: 'structure',
      severity: 'high',
      message: 'Essay needs more paragraphs',
      suggestion: 'Divide your essay into introduction, body paragraphs, and conclusion'
    });
  }

  if (averageSentencesPerParagraph < 2) {
    issues.push({
      type: 'structure',
      severity: 'medium',
      message: 'Paragraphs are too short',
      suggestion: 'Develop your paragraphs with 3-5 sentences each'
    });
  } else if (averageSentencesPerParagraph > 8) {
    issues.push({
      type: 'structure',
      severity: 'medium',
      message: 'Paragraphs are too long',
      suggestion: 'Break long paragraphs into smaller, focused ones'
    });
  }

  if (readabilityGrade < 6) {
    issues.push({
      type: 'style',
      severity: 'low',
      message: 'Writing is too simple for academic level',
      suggestion: 'Use more sophisticated vocabulary and complex sentences'
    });
  } else if (readabilityGrade > 14) {
    issues.push({
      type: 'readability',
      severity: 'medium',
      message: 'Writing may be too complex',
      suggestion: 'Simplify some sentences for better comprehension'
    });
  }

  if (wordCount < 300) {
    issues.push({
      type: 'structure',
      severity: 'high',
      message: 'Essay is too short',
      suggestion: 'Expand your essay with more details, examples, and analysis'
    });
  }

  // Calculate overall score
  let score = 70; // Base score

  // Adjust based on structure
  if (paragraphCount >= 3) score += 5;
  if (averageSentencesPerParagraph >= 3 && averageSentencesPerParagraph <= 5) score += 5;

  // Adjust based on readability
  if (readabilityGrade >= 9 && readabilityGrade <= 12) score += 10;
  if (averageWordsPerSentence >= 15 && averageWordsPerSentence <= 20) score += 5;

  // Adjust based on length
  if (wordCount >= 300) score += 5;

  // Cap at 100
  score = Math.min(100, score);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    averageWordsPerSentence,
    averageSentencesPerParagraph,
    readabilityGrade,
    readingLevel,
    estimatedReadingTime,
    issues,
    score
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  if (word.endsWith('e')) count--;
  return Math.max(1, count);
}
