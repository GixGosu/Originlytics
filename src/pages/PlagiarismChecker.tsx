import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface PlagiarismMatch {
  url: string;
  title: string;
  snippet: string;
  matchedText: string;
  similarity: number;
}

interface PlagiarismResult {
  overallScore: number;
  matches: PlagiarismMatch[];
  uniqueScore: number;
  checkedSentences: number;
  processingTime: number;
}

export function PlagiarismChecker() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<PlagiarismResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Plagiarism Checker - Check for Plagiarism Online | OriginLytics';

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

    setMetaTag('description', 'Free plagiarism checker to detect copied content. Check your text for plagiarism across billions of web pages and academic sources.');
    setMetaTag('keywords', 'plagiarism checker, plagiarism detector, check plagiarism, duplicate content checker, originality checker');
    setPropertyTag('og:title', 'Free Plagiarism Checker - Detect Plagiarism Online');
    setPropertyTag('og:description', 'Check your text for plagiarism with our free online tool.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  const handleCheck = async () => {
    if (!text.trim()) {
      setError('Please enter text to check for plagiarism.');
      return;
    }

    if (wordCount < 10) {
      setError('Please enter at least 10 words for plagiarism checking.');
      return;
    }

    if (wordCount > 1000) {
      setError('Free tier supports up to 1000 words. Sign in for longer texts.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/plagiarism-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to check plagiarism');
      }

      const data: PlagiarismResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const clearText = () => {
    setText('');
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Original';
    if (score >= 70) return 'Mostly Original';
    if (score >= 50) return 'Partially Plagiarized';
    return 'Highly Plagiarized';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={theme === 'dark'
                  ? "/High-Resolution-Color-Logo-on-Transparent-Background-DARK.svg"
                  : "/High-Resolution-Color-Logo-on-Transparent-Background.svg"
                }
                alt="OriginLytics Logo"
                className="h-8 w-auto"
              />
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Free Plagiarism Checker
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Check your text for plagiarism across billions of web pages. Detect copied content and ensure originality.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="text-input" className="text-lg font-semibold">
              Enter Your Text
            </label>
            <div className="flex items-center gap-4">
              <span className={`text-sm ${wordCount > 1000 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {wordCount.toLocaleString()} / 1,000 words
              </span>
              {text && (
                <button
                  onClick={clearText}
                  className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here to check for plagiarism..."
            className="w-full h-64 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {sentenceCount} {sentenceCount === 1 ? 'sentence' : 'sentences'} detected
            </div>
            <button
              onClick={handleCheck}
              disabled={loading || wordCount < 10 || wordCount > 1000}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking...
                </span>
              ) : (
                'Check for Plagiarism'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">Error</h3>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Plagiarism Check Results</h2>
                <div className="mb-6">
                  <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.uniqueScore)}`}>
                    {result.uniqueScore.toFixed(1)}%
                  </div>
                  <div className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                    {getScoreLabel(result.uniqueScore)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Checked {result.checkedSentences} sentences in {(result.processingTime / 1000).toFixed(2)}s
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-500">
                      {result.uniqueScore.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Unique Content
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-red-500">
                      {(100 - result.uniqueScore).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Potential Matches
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-500">
                      {result.matches.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Sources Found
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Matches */}
            {result.matches.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Potential Plagiarism Matches</h3>
                <div className="space-y-4">
                  {result.matches.map((match, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <a
                            href={match.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline"
                          >
                            {match.title}
                          </a>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                            {match.url}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className={`text-2xl font-bold ${match.similarity >= 70 ? 'text-red-500' : match.similarity >= 50 ? 'text-yellow-500' : 'text-gray-500'}`}>
                            {match.similarity}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            similarity
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mt-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          <span className="font-semibold">Matched text:</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                          "{match.matchedText}"
                        </div>
                      </div>
                      {match.snippet && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">Context:</span> {match.snippet}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.matches.length === 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">✓</div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">
                  No Plagiarism Detected
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Your content appears to be original. No significant matches were found across web sources.
                </p>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">How Our Plagiarism Checker Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-semibold mb-2">1. Submit Your Text</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paste your content into the checker (up to 1,000 words for free users)
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-semibold mb-2">2. Deep Web Search</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We search billions of web pages to find potential matches
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">3. Get Detailed Results</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive similarity scores and links to matching sources
              </p>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Related Writing Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/ai-detector"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🤖</div>
              <div className="font-semibold mb-1">AI Detector</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Detect AI-generated content
              </div>
            </Link>
            <Link
              to="/grammar-checker"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">✓</div>
              <div className="font-semibold mb-1">Grammar Checker</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Fix grammar errors
              </div>
            </Link>
            <Link
              to="/essay-checker"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-semibold mb-1">Essay Checker</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Comprehensive essay analysis
              </div>
            </Link>
            <Link
              to="/paraphraser"
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center"
            >
              <div className="text-2xl mb-2">✏️</div>
              <div className="font-semibold mb-1">Paraphraser</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Rewrite text uniquely
              </div>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="bg-white dark:bg-gray-800 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold">What is plagiarism?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Plagiarism is the act of using someone else's work, ideas, or words without proper attribution. It can be intentional or unintentional and is considered academic dishonesty.
              </p>
            </details>
            <details className="bg-white dark:bg-gray-800 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold">How accurate is this plagiarism checker?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Our plagiarism checker searches billions of web pages using Google Custom Search API. While highly effective for web content, it may not detect matches from subscription-only academic databases or unpublished works.
              </p>
            </details>
            <details className="bg-white dark:bg-gray-800 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold">Is my text stored or shared?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                No. We do not store, save, or share your text. All plagiarism checks are processed in real-time and your content is immediately discarded after analysis.
              </p>
            </details>
            <details className="bg-white dark:bg-gray-800 rounded-lg p-6 cursor-pointer">
              <summary className="font-semibold">What should I do if plagiarism is detected?</summary>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                If matches are found, review each source carefully. Ensure proper citations are added, rewrite content in your own words, or remove plagiarized sections. Use our Paraphraser tool to help rewrite content uniquely.
              </p>
            </details>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>&copy; 2024 OriginLytics. Free plagiarism checking powered by Google Custom Search.</p>
            <div className="mt-2">
              <Link to="/" className="hover:text-blue-500">Home</Link>
              {' • '}
              <Link to="/ai-detector" className="hover:text-blue-500">AI Detector</Link>
              {' • '}
              <Link to="/word-counter" className="hover:text-blue-500">Word Counter</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
