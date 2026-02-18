import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

type CitationStyle = 'mla' | 'apa' | 'chicago';
type SourceType = 'website' | 'book' | 'journal' | 'newspaper';

interface CitationData {
  sourceType: SourceType;
  // Website fields
  author?: string;
  title?: string;
  websiteName?: string;
  url?: string;
  accessDate?: string;
  publishDate?: string;
  // Book fields
  publisher?: string;
  publicationYear?: string;
  city?: string;
  // Journal fields
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
}

export function CitationGenerator() {
  const [sourceType, setSourceType] = useState<SourceType>('website');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('mla');
  const [formData, setFormData] = useState<CitationData>({
    sourceType: 'website',
    accessDate: new Date().toISOString().split('T')[0]
  });
  const [citation, setCitation] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Initialize theme and SEO meta tags
  useEffect(() => {
    document.title = 'Free Citation Generator - MLA, APA, Chicago | OriginLytics';

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

    setMetaTag('description', 'Free citation generator for MLA, APA, and Chicago formats. Create accurate citations for websites, books, journals, and newspapers instantly.');
    setMetaTag('keywords', 'citation generator, cite source, bibliography maker, MLA citation, APA citation, Chicago citation, citation maker');
    setPropertyTag('og:title', 'Free Citation Generator - MLA, APA, Chicago');
    setPropertyTag('og:description', 'Create accurate citations in MLA, APA, and Chicago formats instantly.');
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

  const generateCitation = useCallback(() => {
    let result = '';

    switch (citationStyle) {
      case 'mla':
        result = generateMLACitation(formData);
        break;
      case 'apa':
        result = generateAPACitation(formData);
        break;
      case 'chicago':
        result = generateChicagoCitation(formData);
        break;
    }

    setCitation(result);
  }, [citationStyle, formData]);

  const copyToClipboard = useCallback(() => {
    if (citation) {
      navigator.clipboard.writeText(citation);
    }
  }, [citation]);

  const handleInputChange = (field: keyof CitationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSourceTypeChange = (newType: SourceType) => {
    setSourceType(newType);
    setFormData({
      sourceType: newType,
      accessDate: new Date().toISOString().split('T')[0]
    });
    setCitation('');
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
          <Link to="/paraphraser" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Paraphraser
          </Link>
          <Link to="/summarizer" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Summarizer
          </Link>
          <Link to="/grammar-checker" style={{ fontSize: 14, color: 'var(--text-dim)', textDecoration: 'none' }}>
            Grammar
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
        maxWidth: 900,
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
            Free Citation Generator
          </h1>
          <p style={{
            fontSize: 18,
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Create accurate citations in MLA, APA, and Chicago formats. Perfect for students and researchers.
          </p>
        </div>

        {/* Citation Style Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          {(['mla', 'apa', 'chicago'] as CitationStyle[]).map((style) => (
            <button
              key={style}
              onClick={() => setCitationStyle(style)}
              style={{
                padding: '12px 16px',
                borderRadius: 12,
                border: citationStyle === style ? '2px solid var(--accent)' : 'var(--hairline)',
                background: citationStyle === style ? 'rgba(139, 92, 246, 0.1)' : 'var(--card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'uppercase',
                transition: 'all 0.2s ease'
              }}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Source Type Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
          marginBottom: 24
        }}>
          {(['website', 'book', 'journal', 'newspaper'] as SourceType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleSourceTypeChange(type)}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                border: sourceType === type ? '2px solid var(--accent)' : 'var(--hairline)',
                background: sourceType === type ? 'rgba(139, 92, 246, 0.1)' : 'var(--card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 500,
                textTransform: 'capitalize',
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{
          backgroundColor: 'var(--card)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>
            Enter Source Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Common fields */}
            <InputField
              label="Author(s)"
              placeholder="Last, First"
              value={formData.author || ''}
              onChange={(v) => handleInputChange('author', v)}
            />
            <InputField
              label="Title"
              placeholder={sourceType === 'website' ? 'Page or article title' : 'Book or article title'}
              value={formData.title || ''}
              onChange={(v) => handleInputChange('title', v)}
            />

            {/* Website-specific fields */}
            {sourceType === 'website' && (
              <>
                <InputField
                  label="Website Name"
                  placeholder="e.g., The New York Times"
                  value={formData.websiteName || ''}
                  onChange={(v) => handleInputChange('websiteName', v)}
                />
                <InputField
                  label="URL"
                  placeholder="https://example.com"
                  value={formData.url || ''}
                  onChange={(v) => handleInputChange('url', v)}
                />
                <InputField
                  label="Publish Date"
                  type="date"
                  value={formData.publishDate || ''}
                  onChange={(v) => handleInputChange('publishDate', v)}
                />
                <InputField
                  label="Access Date"
                  type="date"
                  value={formData.accessDate || ''}
                  onChange={(v) => handleInputChange('accessDate', v)}
                />
              </>
            )}

            {/* Book-specific fields */}
            {sourceType === 'book' && (
              <>
                <InputField
                  label="Publisher"
                  placeholder="e.g., Penguin Books"
                  value={formData.publisher || ''}
                  onChange={(v) => handleInputChange('publisher', v)}
                />
                <InputField
                  label="Publication Year"
                  placeholder="2024"
                  value={formData.publicationYear || ''}
                  onChange={(v) => handleInputChange('publicationYear', v)}
                />
                <InputField
                  label="City"
                  placeholder="e.g., New York"
                  value={formData.city || ''}
                  onChange={(v) => handleInputChange('city', v)}
                />
              </>
            )}

            {/* Journal-specific fields */}
            {sourceType === 'journal' && (
              <>
                <InputField
                  label="Journal Name"
                  placeholder="e.g., Journal of Psychology"
                  value={formData.journalName || ''}
                  onChange={(v) => handleInputChange('journalName', v)}
                />
                <InputField
                  label="Volume"
                  placeholder="Vol. 12"
                  value={formData.volume || ''}
                  onChange={(v) => handleInputChange('volume', v)}
                />
                <InputField
                  label="Issue"
                  placeholder="No. 3"
                  value={formData.issue || ''}
                  onChange={(v) => handleInputChange('issue', v)}
                />
                <InputField
                  label="Pages"
                  placeholder="123-145"
                  value={formData.pages || ''}
                  onChange={(v) => handleInputChange('pages', v)}
                />
                <InputField
                  label="Publication Year"
                  placeholder="2024"
                  value={formData.publicationYear || ''}
                  onChange={(v) => handleInputChange('publicationYear', v)}
                />
              </>
            )}

            {/* Newspaper-specific fields */}
            {sourceType === 'newspaper' && (
              <>
                <InputField
                  label="Newspaper Name"
                  placeholder="e.g., The Guardian"
                  value={formData.websiteName || ''}
                  onChange={(v) => handleInputChange('websiteName', v)}
                />
                <InputField
                  label="Publish Date"
                  type="date"
                  value={formData.publishDate || ''}
                  onChange={(v) => handleInputChange('publishDate', v)}
                />
                <InputField
                  label="Pages"
                  placeholder="A1, A3"
                  value={formData.pages || ''}
                  onChange={(v) => handleInputChange('pages', v)}
                />
              </>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateCitation}
          disabled={!formData.title}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: 18,
            fontWeight: 700,
            background: !formData.title
              ? 'var(--bg-elev-2)'
              : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: !formData.title ? 'not-allowed' : 'pointer',
            boxShadow: !formData.title ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.4)',
            opacity: !formData.title ? 0.7 : 1,
            marginBottom: 24
          }}
        >
          Generate Citation
        </button>

        {/* Citation Output */}
        {citation && (
          <div style={{
            backgroundColor: 'var(--card)',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                Your Citation ({citationStyle.toUpperCase()})
              </h3>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
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
              padding: 20,
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 12,
              fontFamily: 'Georgia, serif',
              fontSize: 15,
              lineHeight: 1.8,
              color: 'var(--text-primary)',
              wordBreak: 'break-word'
            }}>
              {citation}
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
            How to Use the Citation Generator
          </h2>
          <ol style={{
            fontSize: 14,
            color: 'var(--text-dim)',
            lineHeight: 1.7,
            paddingLeft: 20
          }}>
            <li style={{ marginBottom: 8 }}>Select your citation style (MLA, APA, or Chicago)</li>
            <li style={{ marginBottom: 8 }}>Choose your source type (website, book, journal, or newspaper)</li>
            <li style={{ marginBottom: 8 }}>Fill in the required information fields</li>
            <li style={{ marginBottom: 8 }}>Click "Generate Citation" to create your citation</li>
            <li style={{ marginBottom: 8 }}>Copy the citation to your bibliography or works cited page</li>
          </ol>

          <h3 style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 24,
            marginBottom: 12,
            color: 'var(--text-primary)'
          }}>
            Supported Citation Styles
          </h3>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              MLA (Modern Language Association)
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Commonly used in humanities, literature, and language studies.
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              APA (American Psychological Association)
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Widely used in social sciences, psychology, and education.
            </p>
          </div>

          <div>
            <h4 style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--text-primary)'
            }}>
              Chicago/Turabian
            </h4>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0 }}>
              Popular in history, business, and fine arts.
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
          <Link to="/word-counter" style={{ fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>Word Counter</Link>
        </div>
      </footer>
    </div>
  );
}

// Helper component for input fields
function InputField({ label, placeholder, value, onChange, type = 'text' }: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 6,
        color: 'var(--text-primary)'
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 14,
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: 'var(--hairline)',
          borderRadius: 8,
          fontFamily: 'inherit'
        }}
      />
    </div>
  );
}

// Citation generation functions
function generateMLACitation(data: CitationData): string {
  const { sourceType, author, title, websiteName, url, accessDate, publishDate, publisher, publicationYear, journalName, volume, issue, pages } = data;

  switch (sourceType) {
    case 'website':
      return `${author || 'Author'}. "${title}." ${websiteName}, ${publishDate ? formatDate(publishDate, 'mla') + ', ' : ''}${url || 'URL'}. Accessed ${accessDate ? formatDate(accessDate, 'mla') : 'Date'}.`;

    case 'book':
      return `${author || 'Author'}. ${title}. ${publisher || 'Publisher'}, ${publicationYear || 'Year'}.`;

    case 'journal':
      return `${author || 'Author'}. "${title}." ${journalName || 'Journal'}, vol. ${volume || 'X'}, no. ${issue || 'X'}, ${publicationYear || 'Year'}, pp. ${pages || 'X-X'}.`;

    case 'newspaper':
      return `${author || 'Author'}. "${title}." ${websiteName || 'Newspaper'}, ${publishDate ? formatDate(publishDate, 'mla') : 'Date'}, ${pages ? 'pp. ' + pages : ''}.`;

    default:
      return '';
  }
}

function generateAPACitation(data: CitationData): string {
  const { sourceType, author, title, websiteName, url, accessDate, publishDate, publisher, publicationYear, journalName, volume, issue, pages } = data;

  switch (sourceType) {
    case 'website':
      return `${author || 'Author'}. (${publishDate ? formatDate(publishDate, 'apa-year') : 'n.d.'}). ${title}. ${websiteName}. Retrieved ${accessDate ? formatDate(accessDate, 'apa') : 'Date'}, from ${url || 'URL'}`;

    case 'book':
      return `${author || 'Author'}. (${publicationYear || 'Year'}). ${title}. ${publisher || 'Publisher'}.`;

    case 'journal':
      return `${author || 'Author'}. (${publicationYear || 'Year'}). ${title}. ${journalName || 'Journal'}, ${volume || 'X'}(${issue || 'X'}), ${pages || 'X-X'}.`;

    case 'newspaper':
      return `${author || 'Author'}. (${publishDate ? formatDate(publishDate, 'apa') : 'Date'}). ${title}. ${websiteName || 'Newspaper'}, ${pages ? 'pp. ' + pages : ''}.`;

    default:
      return '';
  }
}

function generateChicagoCitation(data: CitationData): string {
  const { sourceType, author, title, websiteName, url, accessDate, publishDate, publisher, publicationYear, city, journalName, volume, issue, pages } = data;

  switch (sourceType) {
    case 'website':
      return `${author || 'Author'}. "${title}." ${websiteName}. ${publishDate ? formatDate(publishDate, 'chicago') + '. ' : ''}${url || 'URL'} (accessed ${accessDate ? formatDate(accessDate, 'chicago') : 'Date'}).`;

    case 'book':
      return `${author || 'Author'}. ${title}. ${city || 'City'}: ${publisher || 'Publisher'}, ${publicationYear || 'Year'}.`;

    case 'journal':
      return `${author || 'Author'}. "${title}." ${journalName || 'Journal'} ${volume || 'X'}, no. ${issue || 'X'} (${publicationYear || 'Year'}): ${pages || 'X-X'}.`;

    case 'newspaper':
      return `${author || 'Author'}. "${title}." ${websiteName || 'Newspaper'}, ${publishDate ? formatDate(publishDate, 'chicago') : 'Date'}, ${pages || ''}.`;

    default:
      return '';
  }
}

function formatDate(dateString: string, format: 'mla' | 'apa' | 'apa-year' | 'chicago'): string {
  const date = new Date(dateString);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  switch (format) {
    case 'mla':
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    case 'apa':
      return `${monthsFull[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    case 'apa-year':
      return `${date.getFullYear()}`;
    case 'chicago':
      return `${monthsFull[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    default:
      return dateString;
  }
}
