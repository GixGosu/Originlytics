import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface SummarizeResult {
  summary: string;
  originalWordCount: number;
  summaryWordCount: number;
  compressionRatio: string;
  processingTime: number;
}

type SummaryLength = 'short' | 'medium' | 'long';

export function Summarizer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SummarizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [length, setLength] = useState<SummaryLength>('medium');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Text Summarizer - Summarize Articles Online | OriginLytics';

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

    setMetaTag('description', 'Free AI-powered text summarizer. Condense long articles, essays, and documents into concise summaries. Multiple length options: short, medium, and detailed.');
    setMetaTag('keywords', 'summarizer, text summarizer, article summarizer, summarize text, summary generator, ai summary tool');
    setPropertyTag('og:title', 'Free Text Summarizer - Summarize Articles Online');
    setPropertyTag('og:description', 'AI-powered summarization tool. Condense long text into concise summaries instantly.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const handleSummarize = useCallback(async () => {
    if (wordCount < 50) {
      setError('Please enter at least 50 words to summarize.');
      return;
    }

    if (wordCount > 2000) {
      setError('Maximum 2000 words allowed for free summarization. Sign in for longer texts.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, length })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Summarization failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Summarization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [text, length, wordCount]);

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
      navigator.clipboard.writeText(result.summary);
    }
  }, [result]);

  const getLengthDescription = (l: SummaryLength) => {
    switch (l) {
      case 'short': return '2-3 sentences - Quick overview';
      case 'medium': return '4-6 sentences - Balanced summary';
      case 'long': return 'Detailed with bullet points';
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
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Free Text Summarizer
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Condense long articles and documents into concise summaries. AI-powered with adjustable length.
          </p>
        </div>

        {/* Length Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          {(['short', 'medium', 'long'] as SummaryLength[]).map((l) => (
            <button
              key={l}
              onClick={() => setLength(l)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: length === l ? '2px solid var(--accent)' : 'var(--hairline)',
                background: length === l ? 'rgba(59, 130, 246, 0.1)' : 'var(--card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>
                {l}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {getLengthDescription(l)}
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
              Text to Summarize
            </div>
            <div style={{
              position: 'absolute',
              top: 38,
              right: 12,
              fontSize: 12,
              color: wordCount < 50 ? 'var(--text-dim)' : wordCount > 2000 ? '#ef4444' : '#22c55e',
              background: 'var(--bg-elev-1)',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 500,
              zIndex: 1
            }}>
              {wordCount} / 2000 words
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your article, essay, or document here...

Minimum 50 words, maximum 2000 words for free tier."
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
                <span>Summary</span>
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
                minHeight: 350,
                padding: '20px',
                fontSize: 15,
                lineHeight: 1.7,
                backgroundColor: 'var(--card)',
                color: 'var(--text-primary)',
                border: '2px solid var(--border)',
                borderRadius: 16,
                whiteSpace: 'pre-wrap'
              }}>
                {result.summary}
              </div>
              <div style={{
                marginTop: 12,
                fontSize: 12,
                color: 'var(--text-dim)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}>
                <span>{result.summaryWordCount} words (from {result.originalWordCount})</span>
                <span>{result.compressionRatio}% of original</span>
                <span>{result.processingTime}ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Summarize Button */}
        <button
          onClick={handleSummarize}
          disabled={loading || wordCount < 50 || wordCount > 2000}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: loading || wordCount < 50 || wordCount > 2000
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || wordCount < 50 || wordCount > 2000 ? 'not-allowed' : 'pointer',
            boxShadow: loading || wordCount < 50 || wordCount > 2000 ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
            opacity: loading || wordCount < 50 || wordCount > 2000 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {loading ? 'Summarizing...' : 'Summarize Text'}
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
            How Our Text Summarizer Works
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            marginBottom: 16
          }}>
            Our AI-powered summarization tool uses advanced language models to extract key information
            and condense long documents into concise summaries. Choose your preferred summary length:
          </p>
          <ul style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}><strong>Short Summary:</strong> 2-3 sentences for quick overview and time-sensitive reading</li>
            <li style={{ marginBottom: 8 }}><strong>Medium Summary:</strong> 4-6 sentences for balanced coverage of main points</li>
            <li style={{ marginBottom: 8 }}><strong>Long Summary:</strong> Detailed summary with bullet points for comprehensive understanding</li>
          </ul>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Benefits of Using a Summarizer
          </h3>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Save Time
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Quickly understand long articles, research papers, and documents without reading everything.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Study Better
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Create concise study notes from textbooks and academic papers for efficient learning.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Make Decisions Faster
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Get the key points from reports and briefings to make informed decisions quickly.
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
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}
