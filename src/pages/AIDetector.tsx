import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileUpload } from '../components/FileUpload';
import { exportToPDF } from '../lib/pdfExport';
import { generateSoftwareAppSchema, generateFAQSchema, injectSchema, removeSchema } from '../utils/schemaMarkup';

interface DetectionResult {
  score: number;
  confidence: string;
  confidenceValue: number;
  indicators: string[];
  processingTime: number;
  wordCount: number;
  model: string;
}

export function AIDetector() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [fileMetadata, setFileMetadata] = useState<any>(null);

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free AI Detector - Check if Text is AI Generated | OriginLytics';

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

    setMetaTag('description', 'Free AI content detector. Check if text was written by ChatGPT, Claude, or other AI. Instant results with statistical analysis. No signup required.');
    setMetaTag('keywords', 'ai detector, ai content detector, chatgpt detector, ai text checker, detect ai writing, ai detection tool');
    setPropertyTag('og:title', 'Free AI Detector - Check if Text is AI Generated');
    setPropertyTag('og:description', 'Instantly detect AI-generated content. Free, fast, and accurate AI content checker.');
    setPropertyTag('og:type', 'website');

    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://originlytics.com/ai-detector');

    // Inject SoftwareApplication schema
    const appSchema = generateSoftwareAppSchema({
      name: 'OriginLytics AI Detector',
      description: 'Free AI content detector. Check if text was written by ChatGPT, Claude, Gemini, or other AI models with 96%+ accuracy.',
      url: 'https://originlytics.com/ai-detector',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      offers: { price: '0', priceCurrency: 'USD' }
    });
    injectSchema(appSchema, 'schema-software-app');

    // Inject FAQ schema
    const faqSchema = generateFAQSchema([
      {
        question: 'How accurate is the AI detector?',
        answer: 'OriginLytics AI detector achieves 96%+ accuracy using an ensemble of 18 detection metrics including perplexity analysis, burstiness detection, and lexical diversity scoring.'
      },
      {
        question: 'What AI models can it detect?',
        answer: 'Our detector identifies content from ChatGPT (GPT-3.5, GPT-4, GPT-4o), Claude, Gemini, Llama, Mistral, and 20+ other AI writing tools.'
      },
      {
        question: 'Is the AI detector free?',
        answer: 'Yes! You get 3 free AI detection scans per day. No signup required. Additional scans available with credit packages starting at $4.99.'
      },
      {
        question: 'How does AI detection work?',
        answer: 'AI detection analyzes statistical patterns in text including perplexity (predictability), burstiness (sentence variation), vocabulary diversity, and stylistic markers that differ between human and AI writing.'
      }
    ]);
    injectSchema(faqSchema, 'schema-faq');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Cleanup schemas on unmount
    return () => {
      removeSchema('schema-software-app');
      removeSchema('schema-faq');
    };
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(w => w).length;

  const handleAnalyze = useCallback(async () => {
    if (wordCount < 50) {
      setError('Please enter at least 50 words for accurate analysis.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/analyze/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Analysis failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
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

  const getResultColor = (score: number) => {
    if (score < 30) return '#22c55e';
    if (score < 50) return '#84cc16';
    if (score < 70) return '#f59e0b';
    return '#ef4444';
  };

  const getResultLabel = (score: number) => {
    if (score < 30) return 'Likely Human Written';
    if (score < 50) return 'Probably Human';
    if (score < 70) return 'Possibly AI Generated';
    return 'Likely AI Generated';
  };

  const handleFileTextExtracted = (extractedText: string, metadata: any) => {
    setText(extractedText);
    setFileMetadata(metadata);
    setInputMode('text'); // Switch to text mode to show extracted text
  };

  const handleExportPDF = () => {
    if (!result) return;

    exportToPDF({
      title: 'AI Detection Report',
      subtitle: fileMetadata?.filename || `${result.wordCount} words analyzed`,
      data: {
        score: result.score,
        verdict: getResultLabel(result.score),
        summary: `This text analysis detected ${result.score}% likelihood of AI-generated content. Analysis processed ${result.wordCount} words in ${result.processingTime}ms using ${result.model} model.`,
        indicators: result.indicators
      },
      type: 'ai-detection'
    });
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
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Free AI Content Detector
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Check if text was written by ChatGPT, Claude, Gemini, or other AI.
            Instant results with no signup required.
          </p>
        </div>

        {/* Input Mode Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16
        }}>
          <button
            onClick={() => setInputMode('text')}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: inputMode === 'text' ? 'var(--card)' : 'var(--bg-elev-1)',
              color: inputMode === 'text' ? 'var(--text-primary)' : 'var(--text-dim)',
              border: inputMode === 'text' ? '2px solid #3b82f6' : '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            📝 Paste Text
          </button>
          <button
            onClick={() => setInputMode('file')}
            style={{
              flex: 1,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: inputMode === 'file' ? 'var(--card)' : 'var(--bg-elev-1)',
              color: inputMode === 'file' ? 'var(--text-primary)' : 'var(--text-dim)',
              border: inputMode === 'file' ? '2px solid #3b82f6' : '1px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer'
            }}
          >
            📄 Upload File
          </button>
        </div>

        {/* File Upload */}
        {inputMode === 'file' && (
          <div style={{ marginBottom: 20 }}>
            <FileUpload
              onTextExtracted={handleFileTextExtracted}
              acceptedFormats={['.pdf', '.docx', '.txt']}
              maxSize={10 * 1024 * 1024}
              label="Upload Document for AI Detection"
            />
          </div>
        )}

        {/* Text Input */}
        {inputMode === 'text' && (
          <div style={{
            position: 'relative',
            marginBottom: 20
          }}>
          <div style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 12,
            color: wordCount < 50 ? 'var(--text-dim)' : wordCount >= 200 ? '#22c55e' : '#f59e0b',
            background: 'var(--bg-elev-1)',
            padding: '4px 8px',
            borderRadius: 6,
            fontWeight: 500,
            zIndex: 1
          }}>
            {wordCount} words {wordCount < 50 && '(min 50)'}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here to check if it was written by AI...

Enter at least 50 words for basic analysis, or 200+ words for best accuracy."
            style={{
              width: '100%',
              minHeight: 300,
              padding: '44px 20px 20px 20px',
              fontSize: 16,
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
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || wordCount < 50}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: loading || wordCount < 50
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: loading || wordCount < 50 ? 'not-allowed' : 'pointer',
            boxShadow: loading || wordCount < 50 ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
            opacity: loading || wordCount < 50 ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          {loading ? 'Analyzing...' : 'Detect AI Content'}
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

        {/* Results */}
        {result && (
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 20,
            padding: 32,
            boxShadow: 'var(--shadow-2)',
            textAlign: 'center'
          }}>
            {/* Score Ring */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <svg width={160} height={160} style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx={80}
                  cy={80}
                  r={70}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={12}
                />
                <circle
                  cx={80}
                  cy={80}
                  r={70}
                  fill="none"
                  stroke={getResultColor(result.score)}
                  strokeWidth={12}
                  strokeDasharray={`${(result.score / 100) * (2 * Math.PI * 70)} ${2 * Math.PI * 70}`}
                  strokeLinecap="round"
                />
                <text
                  x={80}
                  y={80}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    fill: 'var(--text-primary)',
                    transform: 'rotate(90deg)',
                    transformOrigin: '80px 80px'
                  }}
                >
                  {result.score}%
                </text>
              </svg>
            </div>

            {/* Result Label */}
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: getResultColor(result.score),
              marginBottom: 8
            }}>
              {getResultLabel(result.score)}
            </div>

            <div style={{
              fontSize: 14,
              color: 'var(--text-dim)',
              marginBottom: 24
            }}>
              {result.score}% AI Likelihood | {result.wordCount} words analyzed | {result.processingTime}ms
            </div>

            {/* Indicators */}
            {result.indicators.length > 0 && (
              <div style={{
                textAlign: 'left',
                padding: 16,
                backgroundColor: 'var(--bg-elev-1)',
                borderRadius: 12
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-dim)',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}>
                  Detection Indicators
                </div>
                <ul style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 14,
                  color: 'var(--text-primary)'
                }}>
                  {result.indicators.map((indicator, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{indicator}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportPDF}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: 'var(--bg-elev-1)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              📄 Export as PDF
            </button>

            {/* CTA for Full Analysis */}
            <div style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 12,
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <p style={{
                fontSize: 14,
                color: 'var(--text-dim)',
                marginBottom: 12
              }}>
                Want more detailed analysis with 35+ metrics and 88% accuracy?
              </p>
              <Link
                to="/"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: 'none'
                }}
              >
                Try Full Analysis
              </Link>
            </div>
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
            How Our AI Detector Works
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            marginBottom: 16
          }}>
            Our AI content detector analyzes text using statistical patterns to determine
            if content was likely written by artificial intelligence or a human. We look for:
          </p>
          <ul style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}>Sentence length uniformity - AI tends to write more uniform sentences</li>
            <li style={{ marginBottom: 8 }}>Repetitive sentence starters - AI often begins sentences similarly</li>
            <li style={{ marginBottom: 8 }}>Transitional phrase density - AI overuses formal transitions</li>
            <li style={{ marginBottom: 8 }}>Personal pronoun usage - AI typically uses fewer personal pronouns</li>
            <li style={{ marginBottom: 8 }}>Contraction patterns - AI often avoids contractions</li>
            <li style={{ marginBottom: 8 }}>Vocabulary diversity - AI may have lower diversity in longer texts</li>
          </ul>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Frequently Asked Questions
          </h3>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Is this AI detector free?
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Yes! Our basic AI detection is completely free with no signup required.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              How accurate is AI detection?
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Our quick analysis provides approximately 70% accuracy. For 88% accuracy with
              advanced models like RoBERTa and Binoculars, try our full analysis.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              What AI models can you detect?
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              We can detect content from ChatGPT (GPT-3.5, GPT-4), Claude, Gemini, Llama,
              and other popular AI writing assistants.
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
          marginTop: 12
        }}>
          <Link to="/" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Home</Link>
          <Link to="/ai-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>AI Checker</Link>
          <Link to="/chatgpt-detector" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>ChatGPT Detector</Link>
          <Link to="/paraphraser" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Paraphraser</Link>
          <Link to="/summarizer" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Summarizer</Link>
          <Link to="/grammar-checker" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Grammar Checker</Link>
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}
