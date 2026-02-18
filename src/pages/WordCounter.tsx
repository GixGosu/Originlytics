import { useState, useEffect, useCallback } from 'react';

interface WordCountMetrics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number;
  avgWordLength: number;
  avgSentenceLength: number;
}

export function WordCounter() {
  const [text, setText] = useState('');
  const [metrics, setMetrics] = useState<WordCountMetrics>({
    words: 0,
    characters: 0,
    charactersNoSpaces: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0,
    avgWordLength: 0,
    avgSentenceLength: 0,
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags on mount
  useEffect(() => {
    // Set SEO meta tags
    document.title = 'Word Counter - OriginLytics';

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

    setMetaTag('description', 'Free online word counter tool. Count words, characters, sentences, paragraphs, and get reading time estimates instantly as you type.');
    setMetaTag('keywords', 'word counter, character counter, sentence counter, reading time, text analytics');
    setPropertyTag('og:title', 'Word Counter - OriginLytics');
    setPropertyTag('og:description', 'Count words, characters, and get instant text metrics with our free online word counter.');
    setPropertyTag('og:type', 'website');

    // Set theme
    const savedTheme = localStorage.getItem('ui.theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // Calculate metrics whenever text changes
  const calculateMetrics = useCallback((inputText: string): WordCountMetrics => {
    // Words
    const wordArray = inputText
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    const wordCount = inputText.trim() === '' ? 0 : wordArray.length;

    // Characters
    const charCount = inputText.length;
    const charNoSpaces = inputText.replace(/\s/g, '').length;

    // Sentences (split by . ! ?)
    const sentenceArray = inputText
      .split(/[.!?]+/)
      .filter(sentence => sentence.trim().length > 0);
    const sentenceCount = inputText.trim() === '' ? 0 : sentenceArray.length;

    // Paragraphs (split by double line breaks or more)
    const paragraphArray = inputText
      .split(/\n\n+/)
      .filter(para => para.trim().length > 0);
    const paragraphCount = inputText.trim() === '' ? 0 : paragraphArray.length;

    // Reading time (200 words per minute average)
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    // Average word length
    const avgWordLen =
      wordCount === 0
        ? 0
        : Math.round(
            (charNoSpaces / wordCount) * 100
          ) / 100;

    // Average sentence length
    const avgSentLen =
      sentenceCount === 0
        ? 0
        : Math.round(
            (wordCount / sentenceCount) * 100
          ) / 100;

    return {
      words: wordCount,
      characters: charCount,
      charactersNoSpaces: charNoSpaces,
      sentences: sentenceCount,
      paragraphs: paragraphCount,
      readingTime: readingTimeMinutes,
      avgWordLength: avgWordLen,
      avgSentenceLength: avgSentLen,
    };
  }, []);

  // Handle text change
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      setMetrics(calculateMetrics(newText));
    },
    [calculateMetrics]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    setText('');
    setMetrics({
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTime: 0,
      avgWordLength: 0,
      avgSentenceLength: 0,
    });
  }, []);

  // Handle theme toggle
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('ui.theme', newTheme);
      return newTheme;
    });
  }, []);

  return (
    <div style={containerStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <div style={headerContentStyle}>
            <h1 style={titleStyle}>Word Counter</h1>
            <p style={subtitleStyle}>
              Real-time text analysis and word counting
            </p>
          </div>
          <button
            onClick={toggleTheme}
            style={themeToggleButtonStyle}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>

        {/* Main Content */}
        <main style={mainStyle}>
          {/* Textarea Section */}
          <div style={textAreaContainerStyle}>
            <label htmlFor="text-input" style={labelStyle}>
              Paste your text here
            </label>
            <textarea
              id="text-input"
              value={text}
              onChange={handleTextChange}
              placeholder="Enter your text here to see live statistics..."
              style={textAreaStyle}
              spellCheck="true"
              aria-label="Text input for word counting"
            />
            <div style={buttonGroupStyle}>
              <button
                onClick={handleClear}
                style={clearButtonStyle}
                disabled={text.length === 0}
              >
                Clear Text
              </button>
              <div style={charCountStyle}>
                {text.length} / 100,000
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={metricsGridStyle}>
            {/* Row 1 */}
            <MetricCard
              label="Words"
              value={metrics.words}
              icon="📝"
            />
            <MetricCard
              label="Characters"
              value={metrics.characters}
              icon="🔤"
            />
            <MetricCard
              label="Characters (no spaces)"
              value={metrics.charactersNoSpaces}
              icon="⌫"
            />
            <MetricCard
              label="Sentences"
              value={metrics.sentences}
              icon="📌"
            />

            {/* Row 2 */}
            <MetricCard
              label="Paragraphs"
              value={metrics.paragraphs}
              icon="📄"
            />
            <MetricCard
              label="Reading Time"
              value={`${metrics.readingTime}m`}
              icon="⏱️"
              isTime={true}
            />
            <MetricCard
              label="Avg Word Length"
              value={metrics.avgWordLength}
              icon="📊"
              isDecimal={true}
            />
            <MetricCard
              label="Avg Sentence Length"
              value={metrics.avgSentenceLength}
              icon="📈"
              isDecimal={true}
            />
          </div>

          {/* Additional Info */}
          <div style={infoBoxStyle}>
            <h3 style={infoTitleStyle}>About This Tool</h3>
            <ul style={infoListStyle}>
              <li>
                <strong>Word Count:</strong> Number of words separated by spaces
              </li>
              <li>
                <strong>Character Count:</strong> Total characters including spaces
              </li>
              <li>
                <strong>Reading Time:</strong> Estimated time at 200 words per minute
              </li>
              <li>
                <strong>Sentences:</strong> Determined by periods, exclamation marks, and question marks
              </li>
              <li>
                <strong>Paragraphs:</strong> Determined by line breaks (double-spaced)
              </li>
              <li>
                <strong>Average Metrics:</strong> Calculated based on total content
              </li>
            </ul>
          </div>
        </main>
      </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  isTime?: boolean;
  isDecimal?: boolean;
}

function MetricCard({ label, value, icon, isDecimal }: MetricCardProps) {
  return (
    <div style={metricCardStyle}>
      <div style={metricIconStyle}>{icon}</div>
      <div style={metricContentStyle}>
        <div style={metricValueStyle}>
          {typeof value === 'number' && isDecimal
            ? value.toFixed(2)
            : value}
        </div>
        <div style={metricLabelStyle}>{label}</div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  transition: 'background-color 0.2s ease, color 0.2s ease',
};

const headerStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  borderBottom: 'var(--hairline)',
  padding: '24px 20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
  boxShadow: 'var(--shadow-1)',
};

const headerContentStyle: React.CSSProperties = {
  flex: 1,
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: 32,
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--text-dim)',
};

const themeToggleButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'var(--bg-secondary)',
  border: 'var(--hairline)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 18,
  transition: 'background-color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 40,
  height: 40,
};

const mainStyle: React.CSSProperties = {
  maxWidth: 1000,
  margin: '0 auto',
  padding: '32px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 32,
};

const textAreaContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const textAreaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 300,
  padding: 16,
  border: 'var(--hairline)',
  borderRadius: 12,
  backgroundColor: 'var(--card)',
  color: 'var(--text-primary)',
  fontSize: 16,
  lineHeight: 1.6,
  fontFamily: 'inherit',
  resize: 'vertical',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const clearButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'var(--seo-primary)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 14,
  transition: 'background-color 0.2s ease, opacity 0.2s ease',
};

const charCountStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-dim)',
  fontWeight: 500,
};

const metricsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: 'var(--hairline)',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  boxShadow: 'var(--shadow-1)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const metricIconStyle: React.CSSProperties = {
  fontSize: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const metricContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: 'var(--seo-primary)',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-dim)',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: 'var(--hairline)',
  borderRadius: 12,
  padding: 24,
  boxShadow: 'var(--shadow-1)',
};

const infoTitleStyle: React.CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const infoListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  listStyle: 'disc',
};
