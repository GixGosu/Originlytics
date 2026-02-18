# OriginLytics

AI-powered content authenticity and intelligence platform. 10 analysis tools, 17+ metrics, real ML models — not just API wrappers.

![License](https://img.shields.io/badge/license-MIT-green)

> 🏆 **Top Project** — ELVTR AI Architecture Program (2025)

## Features

### Analysis Tools (10)
- **AI Detector** — RoBERTa classifier + DistilGPT-2 perplexity with ensemble scoring
- **Paraphraser** — Content rewriting with AI detection awareness
- **Summarizer** — GPT-4 powered content summarization
- **Grammar Checker** — Writing quality analysis
- **Citation Generator** — Automated citation formatting
- **Readability Checker** — 9 readability algorithms via textstat
- **Essay Checker** — Academic writing evaluation
- **Text Comparison** — Side-by-side content diff
- **Plagiarism Checker** — Content originality verification
- **Word Counter** — Text statistics and metrics

### Analysis Metrics (17+)
- **AI Detection** — RoBERTa-based classification + perplexity scoring via DistilGPT-2
- **GEO (Generative Engine Optimization)** — 8 weighted metrics for AI search visibility (citation structure, source credibility, structured data, content freshness, author attribution, factual clarity, data presence, content depth)
- **SEO Analysis** — Technical SEO audit with actionable recommendations
- **Toxicity Detection** — Content safety via Detoxify (Unitary) models
- **Emotional Analysis** — NRC Emotion Lexicon sentiment scoring
- **Accessibility** — WCAG compliance checking
- **Premium Metrics** — Readability (9 algorithms), linguistic complexity (POS tagging, NER via NLTK), statistical writing fingerprint
- **Ensemble Scoring** — Weighted normalization across all signals

## Architecture

```
originlytics/
├── src/                          # React/TypeScript frontend (Vite)
│   ├── pages/                    # 10 tool pages + Dashboard
│   ├── components/               # GEO, SEO, Accessibility, Emotional analysis panels
│   ├── scoring/                  # Ensemble scoring + normalization
│   ├── analysis.js               # Core backend — Python subprocess orchestration
│   ├── server.js                 # Express API server
│   └── ...
├── python/                       # ML analysis pipeline
│   ├── ai_detector.py            # RoBERTa classifier + DistilGPT-2 perplexity
│   ├── ai_detector_quick.py      # Fast detection mode
│   ├── geo_analyzer.py           # GEO scoring (8 metrics, weighted)
│   ├── seo_analyzer.py           # SEO evaluation
│   ├── premium_metrics.py        # Readability, linguistics, statistical fingerprint
│   ├── emotion_analyzer.py       # NRC Emotion Lexicon analysis
│   ├── metrics.py                # Base metrics utilities
│   └── requirements.txt          # Python dependencies
├── server.js                     # Express entry point
├── website/                      # Marketing site (originlytics.com)
└── database/                     # Migration scripts
```

## Models

| Model | Purpose | Source |
|-------|---------|--------|
| `Hello-SimpleAI/chatgpt-detector-roberta` | AI content classification | HuggingFace |
| `distilgpt2` | Perplexity-based AI detection | HuggingFace |
| `detoxify` (Unitary) | Toxicity scoring | PyPI |
| `gpt-4.1` | Summarization, key points, translation | OpenAI API |
| NRC Emotion Lexicon | Emotional tone analysis | NRC |
| NLTK (punkt, POS tagger, NER) | Linguistic complexity | NLTK |
| textstat | Readability (9 algorithms) | PyPI |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

```bash
git clone https://github.com/GixGosu/Originlytics.git
cd Originlytics

# Node dependencies
npm install

# Python dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger'); nltk.download('maxent_ne_chunker'); nltk.download('words')"

# Environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run
node server.js          # API on :8080
npm run dev             # Frontend on :5173
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4 and moderation |
| `SUPABASE_URL` | No | Supabase project URL (auth/tokens) |
| `SUPABASE_ANON_KEY` | No | Supabase anon key |
| `STRIPE_SECRET_KEY` | No | Stripe key (premium tier billing) |

## How It Works

1. **Input** → URL or raw text submitted via React frontend
2. **Extraction** → Playwright renders page, extracts clean text
3. **Parallel Analysis Pipeline**:
   - Python subprocess: RoBERTa AI detection + perplexity scoring
   - Python subprocess: GEO analysis (8 weighted metrics)
   - Python subprocess: SEO evaluation
   - Python subprocess: Toxicity via Detoxify
   - Python subprocess: Emotional analysis via NRC Lexicon
   - Python subprocess: Premium metrics (readability, linguistics, fingerprint)
   - Node.js: Accessibility analysis
   - OpenAI API: Summary, key points, translation
4. **Ensemble Scoring** → Weighted normalization across all signals
5. **Dashboard** → Results with gauge rings, metric breakdowns, filtering, CSV export, PDF export

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, CSS design system
- **Backend:** Express, Node.js, Python subprocess orchestration
- **ML:** PyTorch, HuggingFace Transformers, NLTK, textstat, scipy, Detoxify
- **APIs:** OpenAI GPT-4.1, OpenAI Moderation
- **Auth:** Supabase (optional)
- **Payments:** Stripe (optional, for premium tier)
- **Scraping:** Playwright

## Contributing

Pull requests welcome. For major changes, open an issue first.

## License

MIT

---

Built by [BrineShrimp Games](https://github.com/GixGosu)
