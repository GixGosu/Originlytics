import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

interface ComparisonResult {
  similarity: number;
  differences: number;
  additions: string[];
  deletions: string[];
  commonWords: number;
  uniqueToFirst: number;
  uniqueToSecond: number;
}

export function TextComparison() {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Text Comparison Tool - Compare Two Texts | OriginLytics';

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

    setMetaTag('description', 'Free text comparison tool to compare two texts side-by-side. Find differences, calculate similarity, and identify additions and deletions.');
    setMetaTag('keywords', 'text comparison, compare text, diff checker, text difference, compare documents, text similarity');
    setPropertyTag('og:title', 'Free Text Comparison Tool - Compare Two Texts');
    setPropertyTag('og:description', 'Compare two texts side-by-side and find differences instantly.');
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

  const compareTexts = useCallback(() => {
    if (!text1.trim() || !text2.trim()) {
      return;
    }

    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const common = words1.filter(word => set2.has(word)).length;
    const uniqueToFirst = words1.filter(word => !set2.has(word)).length;
    const uniqueToSecond = words2.filter(word => !set1.has(word)).length;

    const totalUnique = set1.size + set2.size;
    const commonUnique = [...set1].filter(word => set2.has(word)).length;
    const similarity = totalUnique > 0 ? (commonUnique * 2 / totalUnique) * 100 : 0;

    // Simple diff - find additions and deletions
    const additions: string[] = [];
    const deletions: string[] = [];

    const sentences1 = text1.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    const sentences2 = text2.split(/[.!?]+/).map(s => s.trim()).filter(s => s);

    sentences2.forEach(s => {
      if (!sentences1.some(s1 => s1.toLowerCase() === s.toLowerCase())) {
        additions.push(s);
      }
    });

    sentences1.forEach(s => {
      if (!sentences2.some(s2 => s2.toLowerCase() === s.toLowerCase())) {
        deletions.push(s);
      }
    });

    setResult({
      similarity,
      differences: uniqueToFirst + uniqueToSecond,
      additions: additions.slice(0, 5),
      deletions: deletions.slice(0, 5),
      commonWords: common,
      uniqueToFirst,
      uniqueToSecond
    });
  }, [text1, text2]);

  const wordCount1 = text1.trim().split(/\s+/).filter(w => w).length;
  const wordCount2 = text2.trim().split(/\s+/).filter(w => w).length;

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
          <Link to="/essay-checker" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Essay Checker
          </Link>
          <Link to="/paraphraser" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Paraphraser
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
            background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Text Comparison Tool
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Compare two texts side-by-side. Find differences, calculate similarity, and identify changes.
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: result ? '1fr 1fr' : '1fr 1fr',
          gap: 20,
          marginBottom: 20
        }}>
          {/* Text 1 */}
          <div style={{ position: 'relative' }}>
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
              color: 'var(--text-dim)',
              background: 'var(--bg-elev-1)',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 500,
              zIndex: 1
            }}>
              {wordCount1} words
            </div>
            <textarea
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="Paste original text here..."
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

          {/* Text 2 */}
          <div style={{ position: 'relative' }}>
            <div style={{
              marginBottom: 8,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              Revised Text
            </div>
            <div style={{
              position: 'absolute',
              top: 38,
              right: 12,
              fontSize: 12,
              color: 'var(--text-dim)',
              background: 'var(--bg-elev-1)',
              padding: '4px 8px',
              borderRadius: 6,
              fontWeight: 500,
              zIndex: 1
            }}>
              {wordCount2} words
            </div>
            <textarea
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="Paste revised text here..."
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
        </div>

        {/* Compare Button */}
        <button
          onClick={compareTexts}
          disabled={!text1.trim() || !text2.trim()}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: !text1.trim() || !text2.trim()
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: !text1.trim() || !text2.trim() ? 'not-allowed' : 'pointer',
            boxShadow: !text1.trim() || !text2.trim() ? 'none' : '0 4px 14px rgba(6, 182, 212, 0.4)',
            opacity: !text1.trim() || !text2.trim() ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          Compare Texts
        </button>

        {/* Results */}
        {result && (
          <>
            {/* Similarity Score */}
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
                color: 'var(--accent)',
                marginBottom: 8
              }}>
                {result.similarity.toFixed(1)}%
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8
              }}>
                Similarity Score
              </div>
              <div style={{
                fontSize: 14,
                color: 'var(--text-dim)'
              }}>
                {result.differences} differences found
              </div>
            </div>

            {/* Statistics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}>
              <StatCard
                label="Common Words"
                value={result.commonWords}
                color="#22c55e"
              />
              <StatCard
                label="Unique to Original"
                value={result.uniqueToFirst}
                color="#3b82f6"
              />
              <StatCard
                label="Unique to Revised"
                value={result.uniqueToSecond}
                color="#8b5cf6"
              />
            </div>

            {/* Additions */}
            {result.additions.length > 0 && (
              <div style={{
                backgroundColor: 'var(--card)',
                borderRadius: 16,
                padding: 24,
                marginBottom: 24
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: '#22c55e'
                }}>
                  ✅ Additions ({result.additions.length})
                </h3>
                {result.additions.map((addition, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 14,
                      lineHeight: 1.6
                    }}
                  >
                    + {addition}
                  </div>
                ))}
              </div>
            )}

            {/* Deletions */}
            {result.deletions.length > 0 && (
              <div style={{
                backgroundColor: 'var(--card)',
                borderRadius: 16,
                padding: 24
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: '#ef4444'
                }}>
                  ❌ Deletions ({result.deletions.length})
                </h3>
                {result.deletions.map((deletion, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 12,
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 14,
                      lineHeight: 1.6
                    }}
                  >
                    - {deletion}
                  </div>
                ))}
              </div>
            )}
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
            How to Use the Text Comparison Tool
          </h2>
          <ol style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}>Paste your original text in the left box</li>
            <li style={{ marginBottom: 8 }}>Paste your revised/comparison text in the right box</li>
            <li style={{ marginBottom: 8 }}>Click "Compare Texts" to see the analysis</li>
            <li style={{ marginBottom: 8 }}>Review the similarity score and differences</li>
            <li style={{ marginBottom: 8 }}>Check additions and deletions to understand changes</li>
          </ol>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Use Cases
          </h3>
          <ul style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}>Compare different versions of documents</li>
            <li style={{ marginBottom: 8 }}>Check essay revisions before and after editing</li>
            <li style={{ marginBottom: 8 }}>Identify plagiarism by comparing similar texts</li>
            <li style={{ marginBottom: 8 }}>Track changes in contracts or agreements</li>
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
          <Link to="/essay-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Essay Checker</Link>
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/paraphraser" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Paraphraser</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 20,
      backgroundColor: 'var(--card)',
      borderRadius: 12,
      border: 'var(--hairline)',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 36, fontWeight: 700, color, marginBottom: 8 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
        {label}
      </div>
    </div>
  );
}
