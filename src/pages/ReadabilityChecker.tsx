import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  smogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  averageGradeLevel: number;
  readingLevel: string;
  readingTime: number; // in minutes
}

interface TextStats {
  sentences: number;
  words: number;
  characters: number;
  syllables: number;
  complexWords: number; // 3+ syllables
  paragraphs: number;
}

export function ReadabilityChecker() {
  const [text, setText] = useState('');
  const [stats, setStats] = useState<TextStats | null>(null);
  const [scores, setScores] = useState<ReadabilityScores | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Readability Checker - Test Text Readability | OriginLytics';

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

    setMetaTag('description', 'Free readability checker using Flesch Reading Ease, Flesch-Kincaid, SMOG, and other formulas. Test your content readability and grade level instantly.');
    setMetaTag('keywords', 'readability checker, reading level, flesch kincaid, readability test, text complexity, grade level checker');
    setPropertyTag('og:title', 'Free Readability Checker - Test Text Readability');
    setPropertyTag('og:description', 'Check text readability with multiple formulas including Flesch-Kincaid and SMOG index.');
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

  const analyzeReadability = useCallback(() => {
    if (!text.trim()) {
      return;
    }

    const textStats = calculateTextStats(text);
    const readabilityScores = calculateReadabilityScores(textStats);

    setStats(textStats);
    setScores(readabilityScores);
  }, [text]);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

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
          <Link to="/paraphraser" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Paraphraser
          </Link>
          <Link to="/grammar-checker" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Grammar
          </Link>
          <Link to="/citation-generator" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Citation
          </Link>
          <Link to="/word-counter" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Counter
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
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Free Readability Checker
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Test your content's readability with 5 industry-standard formulas. Get grade levels and reading ease scores.
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
            Your Text
          </div>
          <div style={{
            position: 'absolute',
            top: 38,
            right: 12,
            fontSize: 12,
            color: wordCount < 100 ? 'var(--text-dim)' : '#22c55e',
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
            placeholder="Paste your text here to check its readability...

Minimum 100 words recommended for accurate results."
            style={{
              width: '100%',
              minHeight: 300,
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

        {/* Analyze Button */}
        <button
          onClick={analyzeReadability}
          disabled={wordCount < 10}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: wordCount < 10
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: wordCount < 10 ? 'not-allowed' : 'pointer',
            boxShadow: wordCount < 10 ? 'none' : '0 4px 14px rgba(6, 182, 212, 0.4)',
            opacity: wordCount < 10 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {wordCount < 10 ? 'Enter at least 10 words' : 'Analyze Readability'}
        </button>

        {/* Results */}
        {scores && stats && (
          <>
            {/* Summary Card */}
            <div style={{
              backgroundColor: 'var(--card)',
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              border: '2px solid var(--accent)'
            }}>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 20,
                color: 'var(--text-primary)'
              }}>
                Readability Summary
              </h2>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 20
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>
                    {scores.averageGradeLevel.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>Average Grade Level</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>
                    {scores.readingLevel}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>Reading Difficulty</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>
                    {scores.readingTime}m
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>Reading Time</div>
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
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
                Readability Scores
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ScoreCard
                  title="Flesch Reading Ease"
                  score={scores.fleschReadingEase}
                  description={getFleschDescription(scores.fleschReadingEase)}
                  maxScore={100}
                  higherIsBetter
                />
                <ScoreCard
                  title="Flesch-Kincaid Grade"
                  score={scores.fleschKincaidGrade}
                  description={`Grade ${scores.fleschKincaidGrade.toFixed(1)} reading level`}
                  maxScore={18}
                />
                <ScoreCard
                  title="SMOG Index"
                  score={scores.smogIndex}
                  description={`Grade ${scores.smogIndex.toFixed(1)} comprehension level`}
                  maxScore={18}
                />
                <ScoreCard
                  title="Coleman-Liau Index"
                  score={scores.colemanLiauIndex}
                  description={`Grade ${scores.colemanLiauIndex.toFixed(1)} reading level`}
                  maxScore={18}
                />
                <ScoreCard
                  title="Automated Readability Index"
                  score={scores.automatedReadabilityIndex}
                  description={`Grade ${scores.automatedReadabilityIndex.toFixed(1)} comprehension`}
                  maxScore={18}
                />
              </div>
            </div>

            {/* Text Statistics */}
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
                Text Statistics
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 16
              }}>
                <StatBox label="Words" value={stats.words} />
                <StatBox label="Sentences" value={stats.sentences} />
                <StatBox label="Paragraphs" value={stats.paragraphs} />
                <StatBox label="Characters" value={stats.characters} />
                <StatBox label="Syllables" value={stats.syllables} />
                <StatBox label="Complex Words" value={stats.complexWords} />
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
            Understanding Readability Scores
          </h2>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              marginBottom: 12,
              color: 'var(--text-primary)'
            }}>
              What is Readability?
            </h3>
            <p style={{
              fontSize: 14,
              color: 'var(--text-dim)',
              lineHeight: 1.7,
              marginBottom: 16
            }}>
              Readability measures how easy or difficult it is to read and understand your text.
              Higher readability scores mean your content is easier to read, which improves user
              engagement and comprehension.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Flesch Reading Ease
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Scores range from 0-100. Higher scores mean easier reading. 60-70 is ideal for general audiences.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Grade Level Formulas
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Flesch-Kincaid, SMOG, Coleman-Liau, and ARI estimate the U.S. school grade level needed to understand your text.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Why Multiple Formulas?
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Different formulas use different factors (syllables, characters, sentence length).
              The average gives you a more reliable readability estimate.
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
          <Link to="/paraphraser" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Paraphraser</Link>
          <Link to="/summarizer" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Summarizer</Link>
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/citation-generator" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Citation Generator</Link>
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function ScoreCard({ title, score, description, maxScore, higherIsBetter }: {
  title: string;
  score: number;
  description: string;
  maxScore: number;
  higherIsBetter?: boolean;
}) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const color = higherIsBetter
    ? (score >= 60 ? '#22c55e' : score >= 30 ? '#f59e0b' : '#ef4444')
    : (score <= 8 ? '#22c55e' : score <= 12 ? '#f59e0b' : '#ef4444');

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
          {title}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>
          {score.toFixed(1)}
        </div>
      </div>
      <div style={{
        height: 6,
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8
      }}>
        <div style={{
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        {description}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      padding: 16,
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 12,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
        {label}
      </div>
    </div>
  );
}

// Readability calculation functions
function calculateTextStats(text: string): TextStats {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const characters = text.replace(/\s/g, '').length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || 1;

  let syllableCount = 0;
  let complexWordCount = 0;

  words.forEach(word => {
    const syllables = countSyllables(word);
    syllableCount += syllables;
    if (syllables >= 3) {
      complexWordCount++;
    }
  });

  return {
    sentences,
    words: wordCount,
    characters,
    syllables: syllableCount,
    complexWords: complexWordCount,
    paragraphs
  };
}

function calculateReadabilityScores(stats: TextStats): ReadabilityScores {
  const { sentences, words, characters, syllables, complexWords } = stats;

  // Flesch Reading Ease: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
  const fleschReadingEase = Math.max(0, Math.min(100,
    206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  ));

  // Flesch-Kincaid Grade Level: 0.39(words/sentences) + 11.8(syllables/words) - 15.59
  const fleschKincaidGrade = Math.max(0,
    0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
  );

  // SMOG Index: 1.0430 * sqrt(complexWords * 30/sentences) + 3.1291
  const smogIndex = Math.max(0,
    1.0430 * Math.sqrt(complexWords * (30 / sentences)) + 3.1291
  );

  // Coleman-Liau Index: 0.0588L - 0.296S - 15.8
  // L = average letters per 100 words, S = average sentences per 100 words
  const L = (characters / words) * 100;
  const S = (sentences / words) * 100;
  const colemanLiauIndex = Math.max(0,
    0.0588 * L - 0.296 * S - 15.8
  );

  // Automated Readability Index: 4.71(characters/words) + 0.5(words/sentences) - 21.43
  const automatedReadabilityIndex = Math.max(0,
    4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
  );

  // Average grade level (excluding Flesch Reading Ease)
  const averageGradeLevel = (
    fleschKincaidGrade + smogIndex + colemanLiauIndex + automatedReadabilityIndex
  ) / 4;

  // Determine reading level
  let readingLevel = 'Very Easy';
  if (averageGradeLevel >= 13) readingLevel = 'College';
  else if (averageGradeLevel >= 9) readingLevel = 'High School';
  else if (averageGradeLevel >= 6) readingLevel = 'Middle School';
  else if (averageGradeLevel >= 3) readingLevel = 'Elementary';

  // Calculate reading time (average 200 words per minute)
  const readingTime = Math.ceil(words / 200);

  return {
    fleschReadingEase,
    fleschKincaidGrade,
    smogIndex,
    colemanLiauIndex,
    automatedReadabilityIndex,
    averageGradeLevel,
    readingLevel,
    readingTime
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

  // Adjust for silent 'e' at the end
  if (word.endsWith('e')) {
    count--;
  }

  // Ensure at least 1 syllable
  return Math.max(1, count);
}

function getFleschDescription(score: number): string {
  if (score >= 90) return 'Very Easy (5th grade)';
  if (score >= 80) return 'Easy (6th grade)';
  if (score >= 70) return 'Fairly Easy (7th grade)';
  if (score >= 60) return 'Standard (8th-9th grade)';
  if (score >= 50) return 'Fairly Difficult (10th-12th grade)';
  if (score >= 30) return 'Difficult (College)';
  return 'Very Difficult (College graduate)';
}
