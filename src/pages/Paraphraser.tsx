import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface ParaphraseResult {
  paraphrased: string;
  originalWordCount: number;
  paraphrasedWordCount: number;
  processingTime: number;
}

type ParaphraseMode = 'standard' | 'formal' | 'creative' | 'simple';

export function Paraphraser() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParaphraseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mode, setMode] = useState<ParaphraseMode>('standard');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Paraphrasing Tool - Rewrite Text Online | OriginLytics';

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

    setMetaTag('description', 'Free online paraphrasing tool. Rewrite and rephrase text while maintaining meaning. Multiple modes: standard, formal, creative, and simple. AI-powered paraphraser.');
    setMetaTag('keywords', 'paraphraser, paraphrasing tool, rephrase text, reword text, rewrite tool, article rewriter');
    setPropertyTag('og:title', 'Free Paraphrasing Tool - Rewrite Text Online');
    setPropertyTag('og:description', 'AI-powered paraphrasing tool. Rewrite text in multiple styles instantly.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const handleParaphrase = useCallback(async () => {
    if (wordCount < 10) {
      setError('Please enter at least 10 words to paraphrase.');
      return;
    }

    if (wordCount > 500) {
      setError('Maximum 500 words allowed for free paraphrasing. Sign in for longer texts.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/paraphrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Paraphrasing failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paraphrasing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [text, mode, wordCount]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ui.theme', newTheme);
      return newTheme;
    });
  }, []);

  const copyToClipboard = useCallback(() => {
    if (result) {
      navigator.clipboard.writeText(result.paraphrased);
    }
  }, [result]);

  const getModeDescription = (m: ParaphraseMode) => {
    switch (m) {
      case 'standard': return 'Balanced rewrite with natural flow';
      case 'formal': return 'Professional and academic tone';
      case 'creative': return 'Unique phrasing and expression';
      case 'simple': return 'Clear and easy to understand';
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
          <Link to="/summarizer" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            Summarizer
          </Link>
          <Link to="/grammar-checker" style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            textDecoration: 'none'
          }}>
            Grammar Checker
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
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Free Paraphrasing Tool
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Rewrite and rephrase text while preserving meaning. AI-powered with multiple writing styles.
          </p>
        </div>

        {/* Mode Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          {(['standard', 'formal', 'creative', 'simple'] as ParaphraseMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: mode === m ? '2px solid var(--accent)' : 'var(--hairline)',
                background: mode === m ? 'rgba(139, 92, 246, 0.1)' : 'var(--card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>
                {m}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {getModeDescription(m)}
              </div>
            </button>
          ))}
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
              Original Text
            </div>
            <div style={{
              position: 'absolute',
              top: 38,
              right: 12,
              fontSize: 12,
              color: wordCount < 10 ? 'var(--text-dim)' : wordCount > 500 ? '#ef4444' : '#22c55e',
              background: 'var(--bg-elev-1)',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 500,
              zIndex: 1
            }}>
              {wordCount} / 500 words
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter or paste text here to paraphrase...

Minimum 10 words, maximum 500 words for free tier."
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

          {/* Output */}
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
                <span>Paraphrased Text</span>
                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <div style={{
                width: '100%',
                minHeight: 300,
                padding: '20px',
                fontSize: 15,
                lineHeight: 1.7,
                backgroundColor: 'var(--card)',
                color: 'var(--text-primary)',
                border: '2px solid var(--border)',
                borderRadius: 16,
                whiteSpace: 'pre-wrap'
              }}>
                {result.paraphrased}
              </div>
              <div style={{
                marginTop: 12,
                fontSize: 12,
                color: 'var(--text-dim)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{result.paraphrasedWordCount} words</span>
                <span>Processed in {result.processingTime}ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Paraphrase Button */}
        <button
          onClick={handleParaphrase}
          disabled={loading || wordCount < 10 || wordCount > 500}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: loading || wordCount < 10 || wordCount > 500
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || wordCount < 10 || wordCount > 500 ? 'not-allowed' : 'pointer',
            boxShadow: loading || wordCount < 10 || wordCount > 500 ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.4)',
            opacity: loading || wordCount < 10 || wordCount > 500 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {loading ? 'Paraphrasing...' : 'Paraphrase Text'}
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
            How Our Paraphrasing Tool Works
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            marginBottom: 16
          }}>
            Our AI-powered paraphrasing tool uses advanced language models to rewrite your text
            while preserving the original meaning. Choose from multiple writing styles:
          </p>
          <ul style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}><strong>Standard Mode:</strong> Balanced rewriting with natural flow, perfect for general use</li>
            <li style={{ marginBottom: 8 }}><strong>Formal Mode:</strong> Professional and academic tone for essays and reports</li>
            <li style={{ marginBottom: 8 }}><strong>Creative Mode:</strong> Unique phrasing and expression for marketing and content</li>
            <li style={{ marginBottom: 8 }}><strong>Simple Mode:</strong> Clear and easy to understand for accessibility</li>
          </ul>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Why Use a Paraphrasing Tool?
          </h3>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Avoid Plagiarism
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Rewrite content in your own words to ensure originality and avoid plagiarism issues.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Improve Clarity
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Simplify complex sentences and make your writing more accessible to readers.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Save Time
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Quickly rephrase content without spending hours manually rewriting text.
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
          <Link to="/summarizer" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Summarizer</Link>
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}
