/**
 * GPTZero Alternative Page
 * SEO-optimized competitor comparison page
 * Target keywords: "gptzero alternative", "alternative to gptzero"
 */

import { useTheme } from '../hooks/useTheme';

export function GPTZeroAlternative() {
  useTheme(); // Apply theme

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)'
    }}>
      {/* Hero Section */}
      <header style={{
        padding: '64px 20px',
        textAlign: 'center',
        borderBottom: '1px solid var(--hairline)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ 
            fontSize: 14, 
            color: 'var(--text-dim)', 
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: 1
          }}>
            GPTZero Alternative
          </p>
          <h1 style={{ 
            fontSize: 42, 
            fontWeight: 700, 
            margin: 0, 
            marginBottom: 24,
            lineHeight: 1.2
          }}>
            Looking for a GPTZero Alternative?
            <br />
            <span style={{ color: 'var(--text-dim)' }}>Try 17 Metrics Instead of 1.</span>
          </h1>
          <p style={{ 
            fontSize: 18, 
            color: 'var(--text-dim)',
            maxWidth: 600,
            margin: '0 auto 32px'
          }}>
            OriginLytics doesn't just detect AI—it analyzes SEO, GEO optimization, 
            emotions, toxicity, and accessibility. Everything GPTZero does, plus 16 more metrics.
          </p>
          <a 
            href="/"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              textDecoration: 'none'
            }}
          >
            Try OriginLytics Free →
          </a>
          <p style={{ 
            fontSize: 13, 
            color: 'var(--text-dim)',
            marginTop: 12
          }}>
            No signup required • 3 free analyses per day
          </p>
        </div>
      </header>

      {/* Why Look for Alternatives */}
      <section style={{
        padding: '64px 20px',
        background: 'var(--bg-elev-1)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 32,
            textAlign: 'center'
          }}>
            Why People Look for GPTZero Alternatives
          </h2>
          
          <div style={{ display: 'grid', gap: 24 }}>
            {[
              {
                title: 'Limited to AI Detection Only',
                description: 'GPTZero tells you if content is AI-generated, but nothing else. No SEO insights, no emotional analysis, no accessibility checking. For content professionals, that\'s just the first of many questions.'
              },
              {
                title: 'Single-Score Simplification',
                description: 'A single "AI probability" score doesn\'t tell you WHY content was flagged. OriginLytics shows 18 individual metrics so you understand exactly which patterns triggered detection.'
              },
              {
                title: 'No Content Optimization Guidance',
                description: 'GPTZero can\'t help you improve content for search engines or AI search visibility. OriginLytics includes SEO and GEO analysis with actionable recommendations.'
              }
            ].map((item, i) => (
              <div 
                key={i}
                style={{
                  padding: 24,
                  borderRadius: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--hairline)'
                }}
              >
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: 12, 
                  fontSize: 18, 
                  fontWeight: 600 
                }}>
                  {item.title}
                </h3>
                <p style={{ 
                  margin: 0, 
                  color: 'var(--text-dim)',
                  lineHeight: 1.6
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{
        padding: '64px 20px'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 32,
            textAlign: 'center'
          }}>
            OriginLytics vs GPTZero: Feature Comparison
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 15
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--hairline)' }}>
                  <th style={{ padding: '16px', textAlign: 'left' }}>Feature</th>
                  <th style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)' }}>GPTZero</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: 700, background: 'var(--bg-elev-1)' }}>OriginLytics</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI Detection', '✓', '✓ 18 metrics'],
                  ['Model Attribution', '✗', '✓ GPT/Claude/Gemini/Llama'],
                  ['SEO Analysis', '✗', '✓ 8 categories'],
                  ['GEO (AI Search) Optimization', '✗', '✓'],
                  ['Emotional Analysis', '✗', '✓ 8 emotions'],
                  ['Toxicity Detection', '✗', '✓'],
                  ['Accessibility Testing', '✗', '✓ WCAG'],
                  ['Sentence-Level Highlighting', '✓', '✓'],
                  ['Text Paste Input', '✓', '✓'],
                  ['URL Analysis', '✗', '✓'],
                  ['Free Tier', '15,000 chars', '3 analyses/day'],
                  ['Pricing', 'From $7.99/mo', 'From $4.99 (credits)'],
                  ['Total Metrics', '1', '17+']
                ].map(([feature, gpt, us], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '16px' }}>{feature}</td>
                    <td style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)' }}>{gpt}</td>
                    <td style={{ 
                      padding: '16px', 
                      textAlign: 'center',
                      fontWeight: 500,
                      background: 'var(--bg-elev-1)'
                    }}>{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Key Differences */}
      <section style={{
        padding: '64px 20px',
        background: 'var(--bg-elev-1)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 32,
            textAlign: 'center'
          }}>
            Key Differences: OriginLytics vs GPTZero
          </h2>

          <div style={{ display: 'grid', gap: 32 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                🎯 17+ Metrics vs 1 Score
              </h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                GPTZero provides a single AI probability percentage. OriginLytics breaks this down 
                into 18 individual metrics—perplexity, burstiness, lexical diversity, sentence variance, 
                punctuation patterns, and more. You see exactly which patterns triggered detection, 
                not just a black-box score.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                📊 SEO Analysis Built-In
              </h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                OriginLytics includes an 8-category SEO audit: title tags, meta descriptions, 
                heading structure, image alt text, link analysis, structured data, social cards, 
                and mobile optimization. GPTZero offers no SEO insights.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                🔮 GEO: AI Search Optimization
              </h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                Unique to OriginLytics: GEO analysis tells you if your content is optimized 
                for AI search engines like ChatGPT, Perplexity, and Google AI Overviews. 
                Will AI cite your content? Now you'll know.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                💭 Emotional Authenticity Scoring
              </h3>
              <p style={{ color: 'var(--text-dim)', lineHeight: 1.7 }}>
                AI-generated text often shows flat emotional variance. OriginLytics maps 8 emotions 
                (joy, trust, fear, surprise, sadness, disgust, anger, anticipation) using the 
                NRC Emotion Lexicon—a signal GPTZero doesn't measure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who Should Switch */}
      <section style={{
        padding: '64px 20px'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 32,
            textAlign: 'center'
          }}>
            Who Should Switch to OriginLytics?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            <div style={{
              padding: 24,
              borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--hairline)'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: '#22c55e' }}>
                ✓ Choose OriginLytics If:
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <li>You need more than just AI detection</li>
                <li>You want SEO insights with your analysis</li>
                <li>You care about AI search visibility (GEO)</li>
                <li>You want to understand WHY content was flagged</li>
                <li>You analyze web pages (not just pasted text)</li>
                <li>You prefer pay-per-use over subscriptions</li>
              </ul>
            </div>

            <div style={{
              padding: 24,
              borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--hairline)'
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: 'var(--text-dim)' }}>
                ○ GPTZero May Be Better If:
              </h3>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                <li>You only need simple AI detection</li>
                <li>You prefer subscription pricing</li>
                <li>You need batch file uploads</li>
                <li>You want plagiarism checking (not in OriginLytics)</li>
                <li>You prioritize speed over depth</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        padding: '64px 20px',
        background: 'var(--bg-elev-1)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            marginBottom: 32,
            textAlign: 'center'
          }}>
            GPTZero Alternative: FAQ
          </h2>

          <div>
            {[
              {
                q: 'Is OriginLytics more accurate than GPTZero?',
                a: 'OriginLytics uses an 18-metric ensemble approach achieving 96%+ accuracy, compared to GPTZero\'s single-model approach. More metrics means more signals for detection, reducing false positives and negatives.'
              },
              {
                q: 'Can I switch from GPTZero to OriginLytics?',
                a: 'Yes! OriginLytics requires no migration—just paste your text or enter a URL. Start with 3 free analyses per day, then purchase credits as needed. No subscription required.'
              },
              {
                q: 'Does OriginLytics have an API?',
                a: 'API access is available for Pro users with credits. Contact support for API documentation and integration guidance.'
              },
              {
                q: 'Why doesn\'t OriginLytics have plagiarism checking?',
                a: 'OriginLytics focuses on content intelligence metrics that GPTZero doesn\'t offer. For plagiarism, we recommend pairing OriginLytics with a dedicated plagiarism tool like Copyscape.'
              }
            ].map((item, i) => (
              <details 
                key={i}
                style={{
                  marginBottom: 16,
                  padding: 20,
                  borderRadius: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--hairline)'
                }}
              >
                <summary style={{
                  cursor: 'pointer',
                  fontSize: 16,
                  fontWeight: 600,
                  listStyle: 'none'
                }}>
                  {item.q}
                </summary>
                <p style={{
                  margin: 0,
                  marginTop: 16,
                  fontSize: 15,
                  lineHeight: 1.7,
                  color: 'var(--text-dim)'
                }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '64px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            marginBottom: 16
          }}>
            Ready to Try the GPTZero Alternative?
          </h2>
          <p style={{ 
            fontSize: 18, 
            color: 'var(--text-dim)',
            marginBottom: 32
          }}>
            Get 17+ metrics instead of 1. No signup required.
          </p>
          <a 
            href="/"
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              fontWeight: 600,
              fontSize: 16,
              textDecoration: 'none'
            }}
          >
            Analyze Content Free →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '32px 20px',
        borderTop: '1px solid var(--hairline)',
        textAlign: 'center',
        fontSize: 14,
        color: 'var(--text-dim)'
      }}>
        <p style={{ margin: 0 }}>
          © 2026 OriginLytics. <a href="/" style={{ color: 'inherit' }}>Return to analyzer</a>
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 12 }}>
          Last updated: February 2026
        </p>
      </footer>
    </div>
  );
}

export default GPTZeroAlternative;
