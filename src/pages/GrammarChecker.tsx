import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface GrammarError {
  message: string;
  replacements: string[];
  context: string;
  offset: number;
  length: number;
  type: 'grammar' | 'spelling' | 'punctuation' | 'typographical' | 'style';
  rule: string;
}

interface GrammarCheckResult {
  errors: GrammarError[];
  errorCount: number;
  wordCount: number;
  processingTime: number;
}

export function GrammarChecker() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedError, setSelectedError] = useState<number | null>(null);

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Grammar Checker - Fix Writing Mistakes Instantly | OriginLytics';

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

    setMetaTag('description', 'Free online grammar checker. Fix grammar, spelling, and punctuation mistakes instantly. AI-powered writing assistant with real-time suggestions.');
    setMetaTag('keywords', 'grammar checker, free grammar check, spelling checker, punctuation checker, writing assistant, grammar tool, proofreading tool');
    setPropertyTag('og:title', 'Free Grammar Checker - Fix Writing Mistakes Instantly');
    setPropertyTag('og:description', 'AI-powered grammar and spelling checker. Improve your writing quality with instant suggestions.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const handleCheckGrammar = useCallback(async () => {
    if (wordCount < 5) {
      setError('Please enter at least 5 words to check.');
      return;
    }

    if (wordCount > 1000) {
      setError('Maximum 1000 words allowed for free grammar checking. Sign in for longer texts.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedError(null);

    try {
      const response = await fetch('/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Grammar check failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grammar check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [text, wordCount]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ui.theme', newTheme);
      return newTheme;
    });
  }, []);

  const applyReplacement = useCallback((errorIndex: number, replacement: string) => {
    if (!result) return;

    const grammarError = result.errors[errorIndex];
    const beforeError = text.substring(0, grammarError.offset);
    const afterError = text.substring(grammarError.offset + grammarError.length);
    const newText = beforeError + replacement + afterError;

    setText(newText);
    setResult(null); // Clear results to encourage re-check
  }, [text, result]);

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case 'spelling': return '#ef4444';
      case 'grammar': return '#f59e0b';
      case 'punctuation': return '#3b82f6';
      case 'style': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case 'spelling': return '📝';
      case 'grammar': return '📚';
      case 'punctuation': return '✏️';
      case 'style': return '🎨';
      default: return '⚠️';
    }
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
          <Link to="/ai-detector" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            AI Detector
          </Link>
          <Link to="/paraphraser" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            Paraphraser
          </Link>
          <Link to="/summarizer" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            Summarizer
          </Link>
          <Link to="/word-counter" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            Word Counter
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
        maxWidth: 1200,
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
            Free Grammar Checker
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Fix grammar, spelling, and punctuation mistakes instantly. AI-powered writing assistant.
          </p>
        </div>

        {/* Input/Output Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: result ? '1fr 1fr' : '1fr',
          gap: 20,
          marginBottom: 20
        }}>
          {/* Input */}
          <div style={{
            position: 'relative'
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
              color: wordCount < 5 ? 'var(--text-dim)' : wordCount > 1000 ? '#ef4444' : '#22c55e',
              background: 'var(--bg-elev-1)',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 500,
              zIndex: 1
            }}>
              {wordCount} / 1000 words
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type or paste your text here to check for grammar, spelling, and punctuation errors...

Minimum 5 words, maximum 1000 words for free tier."
              style={{
                width: '100%',
                minHeight: 400,
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

          {/* Results */}
          {result && (
            <div>
              <div style={{
                marginBottom: 8,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Issues Found: {result.errorCount}</span>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-dim)'
                }}>
                  {result.processingTime}ms
                </span>
              </div>
              <div style={{
                width: '100%',
                minHeight: 400,
                maxHeight: 600,
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: 'var(--card)',
                border: '2px solid var(--border)',
                borderRadius: 16
              }}>
                {result.errorCount === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: 'var(--text-dim)'
                  }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                      No Issues Found!
                    </h3>
                    <p style={{ fontSize: 14 }}>
                      Your text looks great. No grammar, spelling, or punctuation errors detected.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.errors.map((err, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedError(selectedError === index ? null : index)}
                        style={{
                          padding: 16,
                          backgroundColor: selectedError === index ? 'var(--bg-elev-1)' : 'var(--bg-secondary)',
                          border: `2px solid ${selectedError === index ? getErrorTypeColor(err.type) : 'var(--border)'}`,
                          borderRadius: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          marginBottom: 8
                        }}>
                          <span style={{ fontSize: 20 }}>{getErrorTypeIcon(err.type)}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: getErrorTypeColor(err.type),
                              textTransform: 'uppercase',
                              marginBottom: 4
                            }}>
                              {err.type}
                            </div>
                            <div style={{
                              fontSize: 14,
                              color: 'var(--text-primary)',
                              marginBottom: 8
                            }}>
                              {err.message}
                            </div>
                            <div style={{
                              fontSize: 13,
                              color: 'var(--text-dim)',
                              fontFamily: 'monospace',
                              backgroundColor: 'var(--bg-primary)',
                              padding: '8px 12px',
                              borderRadius: 8,
                              marginBottom: selectedError === index ? 12 : 0
                            }}>
                              ...{err.context}...
                            </div>

                            {selectedError === index && err.replacements.length > 0 && (
                              <div style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: '1px solid var(--border)'
                              }}>
                                <div style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'var(--text-dim)',
                                  marginBottom: 8
                                }}>
                                  Suggestions:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {err.replacements.map((replacement, rIndex) => (
                                    <button
                                      key={rIndex}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        applyReplacement(index, replacement);
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        backgroundColor: 'var(--accent)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {replacement}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Check Grammar Button */}
        <button
          onClick={handleCheckGrammar}
          disabled={loading || wordCount < 5 || wordCount > 1000}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: loading || wordCount < 5 || wordCount > 1000
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || wordCount < 5 || wordCount > 1000 ? 'not-allowed' : 'pointer',
            boxShadow: loading || wordCount < 5 || wordCount > 1000 ? 'none' : '0 4px 14px rgba(245, 158, 11, 0.4)',
            opacity: loading || wordCount < 5 || wordCount > 1000 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {loading ? 'Checking Grammar...' : 'Check Grammar'}
        </button>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: 16,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            color: '#ef4444',
            marginBottom: 24
          }}>
            {error}
          </div>
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
            Why Use Our Grammar Checker?
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            marginBottom: 16
          }}>
            Our free online grammar checker helps you write better by detecting and fixing grammar,
            spelling, and punctuation errors in real-time. Perfect for students, professionals, and
            anyone who wants to improve their writing quality.
          </p>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Features
          </h3>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Grammar Detection
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Identifies grammatical errors including subject-verb agreement, tense consistency, and sentence structure.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Spelling Correction
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Catches typos and misspelled words with intelligent suggestions for corrections.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Punctuation Check
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Ensures proper use of commas, periods, apostrophes, and other punctuation marks.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Style Suggestions
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Get recommendations for improving writing style, clarity, and readability.
            </p>
          </div>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Who Should Use This Tool?
          </h3>

          <ul style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}><strong>Students:</strong> Check essays, research papers, and assignments before submission</li>
            <li style={{ marginBottom: 8 }}><strong>Professionals:</strong> Ensure business emails, reports, and documents are error-free</li>
            <li style={{ marginBottom: 8 }}><strong>Writers:</strong> Polish articles, blog posts, and creative writing</li>
            <li style={{ marginBottom: 8 }}><strong>Non-native English speakers:</strong> Improve English writing skills with instant feedback</li>
          </ul>
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
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}
