// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const expressWs = require('express-ws');
const { spawn } = require('child_process');
const config = require('./src/config.js');
const secureLogger = require('./src/secureLogger.js');
const { validate, urlSchema, textAnalysisSchema } = require('./src/validators.js');
const { summarizeContent, analyzePaid, analyzeFree, gpt4Prompt } = require('./src/analysis.js');
const { getUserFromToken, supabaseAdmin, checkTokenBalance, deductTokens, saveAnalysis } = require('./src/supabaseClient.js');

const app = express();
const server = http.createServer(app);

// Enable WebSocket support
expressWs(app, server);

const PORT = config.server.port;

console.log('Starting Express-based server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Trust proxy for HTTPS handling behind load balancer
app.set('trust proxy', 1);

// ============================================================================
// SECURITY: Helmet middleware for security headers (CRITICAL FIX #2)
// ============================================================================
// Configure helmet BEFORE any routes to set security headers on all responses
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://cdn.jsdelivr.net", "https://www.google.com", "https://www.gstatic.com"],
      scriptSrcAttr: null, // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://api.stripe.com", "https://cdn.jsdelivr.net", "https://www.google.com", config.supabase.url, "https://*.supabase.co"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'sameorigin', // Allow iframes from same origin
  },
  noSniff: true, // Prevent MIME sniffing
  xssFilter: true, // Enable XSS filter (legacy browsers)
}));

// Additional custom security headers
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Stripe webhook endpoint MUST come before express.json() middleware
// Stripe requires raw body for signature verification
const stripeWebhook = require('./src/stripeWebhook');
app.use('/api/stripe', stripeWebhook);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================================
// SECURITY: CORS configuration with whitelist (CRITICAL FIX #1)
// ============================================================================
// Replace wildcard (*) with explicit origin whitelist to prevent CSRF
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
  ],
  maxAge: config.cors.maxAge,
}));

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip HTTPS redirect for health checks
    if (req.path === '/health' || req.path === '/') {
      return next();
    }
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    https: req.header('x-forwarded-proto') === 'https'
  });
});

// Email confirmation callback (must be at root level, not under /api)
const { supabase } = require('./src/supabaseClient.js');
app.get('/auth/callback', async (req, res) => {
  const { token_hash, type } = req.query;

  if (type === 'signup' && token_hash) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'signup'
      });

      if (error) {
        return res.redirect(`${config.frontend.url}/?error=${encodeURIComponent(error.message)}`);
      }

      // Redirect to frontend with success
      return res.redirect(`${config.frontend.url}/?verified=true`);
    } catch (error) {
      return res.redirect(`${config.frontend.url}/?error=${encodeURIComponent(error.message)}`);
    }
  }

  // For other callback types or missing parameters
  res.redirect(`${config.frontend.url}/`);
});

// Mount auth routes
const authRoutes = require('./src/authRoutes');
const { requireAuth } = require('./src/authRoutes');
app.use('/api', authRoutes);

// Mount Stripe routes
const stripeRoutes = require('./src/stripeRoutes');
app.use('/api/stripe', stripeRoutes);

// Mount error logging and analytics routes
const errorRoutes = require('./src/errorRoutes');
app.use('/api', errorRoutes);

// API endpoint with input validation
app.post('/api/analyze', validate(urlSchema), async (req, res) => {
  try {
    // Input is now validated by middleware - safe to use
    const { url, text, useAdvanced } = req.body;

    // SECURITY: Don't log full URL (may contain PII in query params)
    secureLogger.logWithContext('info', 'Analysis started', {
      inputType: url ? 'url' : 'text',
      domain: url ? secureLogger.sanitizeUrl(url) : 'direct_text',
      useAdvanced,
    });
    
    // Determine whether to enable advanced Binoculars detection for this request
    // Advanced detection is OPTIONAL and only available for users with tokens
    let allowAdvanced = false; // Default to free tier
    let userId = null;
    let tokensToDeduct = 0;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const { user } = await getUserFromToken(authHeader);
        if (user && user.id) {
          userId = user.id;
          
          // Only use tokens if user explicitly requests advanced detection
          if (useAdvanced === true) {
            tokensToDeduct = 1; // Advanced analysis costs 1 token
            
            // Check if user has tokens available
            const { sufficient, balance } = await checkTokenBalance(userId, tokensToDeduct);
            
            if (!sufficient) {
              return res.status(402).json({ 
                error: 'Insufficient tokens',
                balance: balance,
                needed: tokensToDeduct,
                message: 'Please purchase more tokens to use advanced AI detection.'
              });
            }
            
            // Enable advanced Binoculars detection
            allowAdvanced = true;
          }
          // else: authenticated user gets free basic analysis (no tokens deducted)
        }
      }
    } catch (e) {
      secureLogger.warn('Failed to resolve user/tokens, proceeding with free tier:', e.message);
    }

    // Use tiered analysis functions to get premium metrics for paid users
    let result;
    const inputSource = url || text;
    if (allowAdvanced) {
      // Paid tier: Use analyzePaid which includes all premium metrics
      result = await analyzePaid(inputSource, null, { allowAdvanced: true, isDirectText: !url });
    } else {
      // Free tier: Use analyzeFree (no premium metrics)
      result = await analyzeFree(inputSource, null, { allowAdvanced: false, isDirectText: !url });
    }

    // Deduct tokens and save analysis only if tokens were used
    if (userId && tokensToDeduct > 0) {
      try {
        const description = url ? secureLogger.sanitizeUrl(url) : 'Direct text analysis';
        await deductTokens(userId, tokensToDeduct, `Advanced analysis: ${description}`);
        await saveAnalysis(userId, url || 'direct_text', 'advanced', result, tokensToDeduct);
      } catch (e) {
        secureLogger.error('Failed to record token usage:', e.message);
        // Don't fail the request if token recording fails
      }
    } else if (userId) {
      // Save free analysis without deducting tokens
      try {
        await saveAnalysis(userId, url || 'direct_text', 'basic', result, 0);
      } catch (e) {
        secureLogger.error('Failed to save analysis:', e.message);
      }
    }

    // Add tier information to response
    const tier = allowAdvanced ? 'paid' : 'free';
    const response = {
      ...result,
      tier: tier
    };

    res.json(response);
  } catch (error) {
    // SECURITY: Don't expose internal error details in production
    // TEMPORARY: Enhanced logging for debugging Python issues
    secureLogger.error('Analysis error (detailed):', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Check if this is a word count error - show clear message
    const isWordCountError = error.message.includes('Content too short') || error.message.includes('minimum 200 words');
    
    res.status(isWordCountError ? 400 : 500).json({
      error: isWordCountError ? 'Content too short' : 'Analysis failed',
      message: isWordCountError 
        ? 'Please provide at least 200 words for accurate analysis. Quality AI detection requires sufficient content.' 
        : (process.env.NODE_ENV === 'production' ? 'An error occurred during analysis' : error.message),
      summary: isWordCountError ? 'Content too short for analysis' : 'Analysis failed due to an error',
      keyPoints: isWordCountError ? 'Minimum 200 words required' : 'Unable to extract key points',
      aiLikelihood: { scores: {}, notes: isWordCountError ? 'Content too short for AI detection' : 'Analysis failed' },
      toxicityScore: 0
    });
  }
});

// ============================================================================
// QUICK ANALYSIS ENDPOINT - Statistical heuristics only (<3 second response)
// ============================================================================

/**
 * Run quick AI detection using Python statistical heuristics script
 * @param {string} text - Text to analyze
 * @returns {Promise<object>} Detection result
 */
function runQuickDetection(text) {
  return new Promise((resolve, reject) => {
    const timeout = 5000; // 5 second timeout
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, 'python', 'ai_detector_quick.py');

    const pythonProcess = spawn(pythonPath, [scriptPath, '--stdin']);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGTERM');
      reject(new Error('Quick detection timed out'));
    }, timeout);

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      if (timedOut) return;

      if (code !== 0) {
        secureLogger.error('Quick detection failed:', { code, stderr });
        reject(new Error(`Quick detection failed with code ${code}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        secureLogger.error('Failed to parse quick detection output:', { stdout, error: e.message });
        reject(new Error('Failed to parse detection result'));
      }
    });

    pythonProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      secureLogger.error('Failed to start quick detection:', err.message);
      reject(err);
    });

    // Send text to stdin and close
    pythonProcess.stdin.write(text);
    pythonProcess.stdin.end();
  });
}

app.post('/api/analyze/quick', validate(textAnalysisSchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text } = req.body;

    // Minimum word count check for accurate analysis
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({
        error: 'Content too short',
        message: 'Quick analysis requires at least 50 words for accurate results.',
        wordCount,
        minimumWords: 50
      });
    }

    secureLogger.logWithContext('info', 'Quick analysis started', {
      wordCount,
      textLength: text.length
    });

    // Run lightweight Python heuristic detection
    const result = await runQuickDetection(text);

    // Map confidence score to categorical level
    const confidenceLevel = result.confidence >= 0.8 ? 'high'
                          : result.confidence >= 0.5 ? 'medium'
                          : 'low';

    const elapsed = Date.now() - startTime;

    secureLogger.logWithContext('info', 'Quick analysis completed', {
      wordCount,
      score: result.ai_likelihood,
      confidence: confidenceLevel,
      processingTime: elapsed
    });

    res.json({
      score: result.ai_likelihood,
      confidence: confidenceLevel,
      confidenceValue: result.confidence,
      status: 'preliminary',
      indicators: result.indicators || [],
      processingTime: elapsed,
      wordCount,
      model: result.model,
      note: 'Quick analysis uses statistical heuristics. For comprehensive AI detection with advanced models, use /api/analyze with useAdvanced=true.'
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;

    secureLogger.error('Quick analysis error:', {
      message: error.message,
      processingTime: elapsed
    });

    // Return graceful fallback for timeout or processing errors
    if (error.message.includes('timed out')) {
      return res.status(504).json({
        error: 'Analysis timeout',
        message: 'Quick analysis took too long. Please try again or use the full analysis.',
        processingTime: elapsed
      });
    }

    res.status(500).json({
      error: 'Quick analysis failed',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during quick analysis'
        : error.message,
      processingTime: elapsed
    });
  }
});

// ============================================================================
// PARAPHRASE ENDPOINT - AI-powered text rewriting
// ============================================================================

app.post('/api/paraphrase', validate(textAnalysisSchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, mode = 'standard' } = req.body;

    // Word count validation
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 10) {
      return res.status(400).json({
        error: 'Content too short',
        message: 'Paraphrasing requires at least 10 words.',
        wordCount,
        minimumWords: 10
      });
    }

    if (wordCount > 500) {
      return res.status(400).json({
        error: 'Content too long',
        message: 'Free tier supports up to 500 words. Sign in for longer texts.',
        wordCount,
        maximumWords: 500
      });
    }

    secureLogger.logWithContext('info', 'Paraphrase started', {
      wordCount,
      mode,
      textLength: text.length
    });

    // Create mode-specific prompt
    let modeInstruction = '';
    switch (mode) {
      case 'formal':
        modeInstruction = 'Rewrite the following text in a formal, professional, and academic tone. Use sophisticated vocabulary and complete sentences.';
        break;
      case 'creative':
        modeInstruction = 'Rewrite the following text with creative and unique phrasing. Use vivid language and varied sentence structures.';
        break;
      case 'simple':
        modeInstruction = 'Rewrite the following text in simple, clear, and easy-to-understand language. Use short sentences and common words.';
        break;
      default: // standard
        modeInstruction = 'Rewrite the following text while preserving its meaning. Use natural language with balanced tone and varied sentence structure.';
    }

    const prompt = `${modeInstruction}

Original text:
${text}

Paraphrased text:`;

    // Call GPT-4o-mini for paraphrasing
    const paraphrased = await gpt4Prompt(prompt, 'gpt-4o-mini');

    const paraphrasedWordCount = paraphrased.trim().split(/\s+/).length;
    const elapsed = Date.now() - startTime;

    secureLogger.logWithContext('info', 'Paraphrase completed', {
      originalWords: wordCount,
      paraphrasedWords: paraphrasedWordCount,
      processingTime: elapsed
    });

    res.json({
      paraphrased,
      originalWordCount: wordCount,
      paraphrasedWordCount,
      processingTime: elapsed,
      mode
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;

    secureLogger.error('Paraphrase error:', {
      message: error.message,
      processingTime: elapsed
    });

    res.status(500).json({
      error: 'Paraphrasing failed',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during paraphrasing'
        : error.message,
      processingTime: elapsed
    });
  }
});

// ============================================================================
// SUMMARIZE ENDPOINT - AI-powered text summarization
// ============================================================================

app.post('/api/summarize', validate(textAnalysisSchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, length = 'medium' } = req.body;

    // Word count validation
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 50) {
      return res.status(400).json({
        error: 'Content too short',
        message: 'Summarization requires at least 50 words.',
        wordCount,
        minimumWords: 50
      });
    }

    if (wordCount > 2000) {
      return res.status(400).json({
        error: 'Content too long',
        message: 'Free tier supports up to 2000 words. Sign in for longer texts.',
        wordCount,
        maximumWords: 2000
      });
    }

    secureLogger.logWithContext('info', 'Summarize started', {
      wordCount,
      length,
      textLength: text.length
    });

    // Create length-specific prompt
    let lengthInstruction = '';
    switch (length) {
      case 'short':
        lengthInstruction = 'Provide a brief 2-3 sentence summary.';
        break;
      case 'long':
        lengthInstruction = 'Provide a detailed summary with key points in bullet format.';
        break;
      default: // medium
        lengthInstruction = 'Provide a concise paragraph summary (4-6 sentences).';
    }

    const prompt = `${lengthInstruction}

Text to summarize:
${text}

Summary:`;

    // Call GPT-4o-mini for summarization
    const summary = await gpt4Prompt(prompt, 'gpt-4o-mini');

    const summaryWordCount = summary.trim().split(/\s+/).length;
    const elapsed = Date.now() - startTime;

    secureLogger.logWithContext('info', 'Summarize completed', {
      originalWords: wordCount,
      summaryWords: summaryWordCount,
      compressionRatio: (summaryWordCount / wordCount * 100).toFixed(1),
      processingTime: elapsed
    });

    res.json({
      summary,
      originalWordCount: wordCount,
      summaryWordCount,
      compressionRatio: (summaryWordCount / wordCount * 100).toFixed(1),
      processingTime: elapsed,
      length
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;

    secureLogger.error('Summarize error:', {
      message: error.message,
      processingTime: elapsed
    });

    res.status(500).json({
      error: 'Summarization failed',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during summarization'
        : error.message,
      processingTime: elapsed
    });
  }
});

// ============================================================================
// GRAMMAR CHECKER ENDPOINT
// ============================================================================
app.post('/api/grammar-check', validate(textAnalysisSchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text } = req.body;

    // Word count validation
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 5) {
      return res.status(400).json({
        error: 'Content too short',
        message: 'Grammar checking requires at least 5 words.',
        wordCount,
        minimumWords: 5
      });
    }

    if (wordCount > 1000) {
      return res.status(400).json({
        error: 'Content too long',
        message: 'Free tier supports up to 1000 words. Sign in for longer texts.',
        wordCount,
        maximumWords: 1000
      });
    }

    secureLogger.logWithContext('info', 'Grammar check started', {
      wordCount,
      textLength: text.length
    });

    // Use LanguageTool API (free tier)
    const languageToolResponse = await fetch('https://api.languagetoolplus.com/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        text: text,
        language: 'en-US',
        enabledOnly: 'false'
      })
    });

    if (!languageToolResponse.ok) {
      throw new Error(`LanguageTool API error: ${languageToolResponse.status}`);
    }

    const languageToolData = await languageToolResponse.json();

    // Transform LanguageTool response to our format
    const errors = languageToolData.matches.map(match => {
      // Determine error type
      let type = 'grammar';
      const issueType = match.rule.issueType?.toLowerCase() || '';
      if (issueType.includes('misspelling') || match.rule.category.id === 'TYPOS') {
        type = 'spelling';
      } else if (issueType.includes('punctuation') || match.rule.category.id === 'PUNCTUATION') {
        type = 'punctuation';
      } else if (issueType.includes('style') || match.rule.category.id === 'STYLE') {
        type = 'style';
      } else if (issueType.includes('typographical')) {
        type = 'typographical';
      }

      return {
        message: match.message,
        replacements: match.replacements.slice(0, 3).map(r => r.value),
        context: match.context.text,
        offset: match.offset,
        length: match.length,
        type,
        rule: match.rule.id
      };
    });

    const elapsed = Date.now() - startTime;

    secureLogger.logWithContext('info', 'Grammar check completed', {
      wordCount,
      errorCount: errors.length,
      processingTime: elapsed
    });

    res.json({
      errors,
      errorCount: errors.length,
      wordCount,
      processingTime: elapsed
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;

    secureLogger.error('Grammar check error:', {
      message: error.message,
      processingTime: elapsed
    });

    res.status(500).json({
      error: 'Grammar check failed',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during grammar checking'
        : error.message,
      processingTime: elapsed
    });
  }
});

// ============================================================================
// PLAGIARISM CHECKER ENDPOINT
// ============================================================================
app.post('/api/plagiarism-check', validate(textAnalysisSchema), async (req, res) => {
  const startTime = Date.now();

  try {
    const { text } = req.body;

    // Word count validation
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount < 10) {
      return res.status(400).json({
        error: 'Content too short',
        message: 'Plagiarism checking requires at least 10 words.',
        wordCount,
        minimumWords: 10
      });
    }

    if (wordCount > 1000) {
      return res.status(400).json({
        error: 'Content too long',
        message: 'Free tier supports up to 1000 words. Sign in for longer texts.',
        wordCount,
        maximumWords: 1000
      });
    }

    secureLogger.logWithContext('info', 'Plagiarism check started', {
      wordCount,
      textLength: text.length
    });

    // Split text into sentences for checking
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const matches = [];

    // Check if Google API credentials are configured
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!googleApiKey || !searchEngineId) {
      // Return mock results if API not configured (for testing)
      secureLogger.logWithContext('warn', 'Google API not configured, returning mock results');

      const elapsed = Date.now() - startTime;
      return res.json({
        overallScore: 95,
        matches: [],
        uniqueScore: 95,
        checkedSentences: sentences.length,
        processingTime: elapsed
      });
    }

    // Search for each sentence (limit to 5 sentences to stay within API quota)
    const sentencesToCheck = sentences.slice(0, 5);

    for (const sentence of sentencesToCheck) {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length < 20) continue; // Skip very short sentences

      try {
        // Use Google Custom Search API
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.append('key', googleApiKey);
        searchUrl.searchParams.append('cx', searchEngineId);
        searchUrl.searchParams.append('q', `"${cleanSentence}"`);
        searchUrl.searchParams.append('num', '3'); // Get top 3 results

        const searchResponse = await fetch(searchUrl.toString());

        if (!searchResponse.ok) {
          secureLogger.logWithContext('warn', 'Google Search API error', {
            status: searchResponse.status
          });
          continue;
        }

        const searchData = await searchResponse.json();

        // Process search results
        if (searchData.items && searchData.items.length > 0) {
          for (const item of searchData.items) {
            // Calculate simple similarity (in real implementation, would use more sophisticated algorithm)
            const snippet = item.snippet || '';
            const similarity = snippet.toLowerCase().includes(cleanSentence.toLowerCase()) ? 85 : 70;

            matches.push({
              url: item.link,
              title: item.title,
              snippet: snippet,
              matchedText: cleanSentence.substring(0, 150),
              similarity
            });
          }
        }
      } catch (error) {
        secureLogger.logWithContext('warn', 'Error checking sentence', {
          error: error.message
        });
        // Continue with other sentences
      }
    }

    // Calculate uniqueness score
    const totalMatches = matches.length;
    const uniqueScore = Math.max(0, Math.min(100, 100 - (totalMatches * 10)));

    const elapsed = Date.now() - startTime;

    secureLogger.logWithContext('info', 'Plagiarism check completed', {
      wordCount,
      matchesFound: matches.length,
      uniqueScore,
      processingTime: elapsed
    });

    // Remove duplicates (same URL)
    const uniqueMatches = matches.filter((match, index, self) =>
      index === self.findIndex((m) => m.url === match.url)
    );

    res.json({
      overallScore: uniqueScore,
      matches: uniqueMatches.slice(0, 10), // Return top 10 matches
      uniqueScore,
      checkedSentences: sentencesToCheck.length,
      processingTime: elapsed
    });

  } catch (error) {
    const elapsed = Date.now() - startTime;

    secureLogger.error('Plagiarism check error:', {
      message: error.message,
      processingTime: elapsed
    });

    res.status(500).json({
      error: 'Plagiarism check failed',
      message: process.env.NODE_ENV === 'production'
        ? 'An error occurred during plagiarism checking'
        : error.message,
      processingTime: elapsed
    });
  }
});

// ============================================================================
// FILE UPLOAD AND BATCH PROCESSING ENDPOINTS
// ============================================================================
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

// Configure multer for memory storage (no disk writes for security)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 10 // Max 10 files per batch
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, DOCX, TXT allowed.'));
    }
  }
});

// Extract text from buffer based on file type
async function extractText(buffer, mimeType, filename) {
  try {
    switch (mimeType) {
      case 'application/pdf': {
        const data = await pdfParse(buffer);
        return {
          text: data.text,
          pageCount: data.numpages,
          metadata: {
            title: data.info?.Title || filename,
            author: data.info?.Author || 'Unknown'
          }
        };
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await mammoth.extractRawText({ buffer });
        return {
          text: result.value,
          pageCount: null,
          metadata: {
            title: filename,
            warnings: result.messages.length
          }
        };
      }

      case 'text/plain': {
        return {
          text: buffer.toString('utf-8'),
          pageCount: null,
          metadata: { title: filename }
        };
      }

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    throw new Error(`Failed to extract text from ${filename}: ${error.message}`);
  }
}

// Single file upload endpoint
app.post('/api/upload',
  requireAuth,
  upload.single('file'),
  async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }

      const { buffer, mimetype, originalname, size } = req.file;

      secureLogger.logWithContext('info', 'File upload received', {
        filename: originalname,
        mimetype,
        size,
        user: req.user.email
      });

      // Extract text
      const extracted = await extractText(buffer, mimetype, originalname);

      // Validate text length
      const wordCount = extracted.text.trim().split(/\s+/).filter(Boolean).length;

      if (wordCount < 10) {
        return res.status(400).json({
          error: 'Insufficient content',
          message: 'Uploaded file contains less than 10 words',
          wordCount
        });
      }

      // Check word limit based on subscription
      const maxWords = req.user.subscription_tier === 'pro' ? 50000 : 10000;
      if (wordCount > maxWords) {
        return res.status(400).json({
          error: 'Content too long',
          message: `File exceeds ${maxWords.toLocaleString()} word limit for ${req.user.subscription_tier} tier`,
          wordCount,
          maxWords
        });
      }

      const processingTime = Date.now() - startTime;

      secureLogger.logWithContext('info', 'Text extracted successfully', {
        filename: originalname,
        wordCount,
        processingTime
      });

      res.json({
        success: true,
        filename: originalname,
        text: extracted.text,
        wordCount,
        pageCount: extracted.pageCount,
        metadata: extracted.metadata,
        processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      secureLogger.error('File upload error:', {
        error: error.message,
        filename: req.file?.originalname,
        processingTime
      });

      res.status(500).json({
        error: 'Upload failed',
        message: process.env.NODE_ENV === 'production'
          ? 'An error occurred while processing your file'
          : error.message,
        processingTime
      });
    }
  }
);

// Batch upload endpoint (multiple files)
app.post('/api/batch-upload',
  requireAuth,
  upload.array('files', 10),
  async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select at least one file'
        });
      }

      secureLogger.logWithContext('info', 'Batch upload received', {
        fileCount: req.files.length,
        user: req.user.email
      });

      // Create batch job record
      const { data: batchJob, error: batchError } = await supabaseAdmin
        .from('batch_jobs')
        .insert({
          user_id: req.user.id,
          status: 'pending',
          total_files: req.files.length,
          completed_files: 0,
          failed_files: 0
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Return immediately with batch job ID
      res.json({
        batchId: batchJob.id,
        totalFiles: req.files.length,
        status: 'pending',
        message: 'Batch processing started',
        processingTime: Date.now() - startTime
      });

      // Process files asynchronously
      processBatchAsync(batchJob.id, req.files, req.user).catch(error => {
        secureLogger.error('Async batch processing error:', {
          batchId: batchJob.id,
          error: error.message
        });
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      secureLogger.error('Batch upload error:', {
        error: error.message,
        processingTime
      });

      res.status(500).json({
        error: 'Batch upload failed',
        message: error.message,
        processingTime
      });
    }
  }
);

// Asynchronous batch processing function
async function processBatchAsync(batchId, files, user) {
  const results = [];
  let completed = 0;
  let failed = 0;

  try {
    // Update status to processing
    await supabaseAdmin
      .from('batch_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', batchId);

    // Process each file
    for (const file of files) {
      try {
        const extracted = await extractText(file.buffer, file.mimetype, file.originalname);
        const wordCount = extracted.text.trim().split(/\s+/).filter(Boolean).length;

        results.push({
          filename: file.originalname,
          status: 'success',
          text: extracted.text.substring(0, 500), // Store first 500 chars
          wordCount,
          pageCount: extracted.pageCount,
          metadata: extracted.metadata
        });

        completed++;

        // Update progress
        await supabaseAdmin
          .from('batch_jobs')
          .update({
            completed_files: completed,
            results: JSON.stringify(results)
          })
          .eq('id', batchId);

        secureLogger.logWithContext('info', 'Batch file processed', {
          batchId,
          filename: file.originalname,
          progress: `${completed}/${files.length}`
        });

      } catch (error) {
        results.push({
          filename: file.originalname,
          status: 'failed',
          error: error.message
        });

        failed++;

        await supabaseAdmin
          .from('batch_jobs')
          .update({
            failed_files: failed,
            results: JSON.stringify(results)
          })
          .eq('id', batchId);

        secureLogger.logWithContext('warn', 'Batch file failed', {
          batchId,
          filename: file.originalname,
          error: error.message
        });
      }
    }

    // Mark as completed
    await supabaseAdmin
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results: JSON.stringify(results)
      })
      .eq('id', batchId);

    secureLogger.logWithContext('info', 'Batch processing completed', {
      batchId,
      completed,
      failed,
      total: files.length
    });

  } catch (error) {
    secureLogger.error('Batch processing error:', {
      batchId,
      error: error.message
    });

    await supabaseAdmin
      .from('batch_jobs')
      .update({
        status: 'failed',
        error_details: JSON.stringify({ error: error.message })
      })
      .eq('id', batchId);
  }
}

// Get batch job status
app.get('/api/batch-status/:batchId',
  requireAuth,
  async (req, res) => {
    try {
      const { batchId } = req.params;

      const { data: batchJob, error } = await supabaseAdmin
        .from('batch_jobs')
        .select('*')
        .eq('id', batchId)
        .eq('user_id', req.user.id)
        .single();

      if (error) throw error;

      if (!batchJob) {
        return res.status(404).json({
          error: 'Batch not found'
        });
      }

      // Parse results if they exist
      let results = [];
      if (batchJob.results) {
        try {
          results = typeof batchJob.results === 'string'
            ? JSON.parse(batchJob.results)
            : batchJob.results;
        } catch (e) {
          results = [];
        }
      }

      res.json({
        batchId: batchJob.id,
        status: batchJob.status,
        totalFiles: batchJob.total_files,
        completedFiles: batchJob.completed_files,
        failedFiles: batchJob.failed_files,
        results,
        createdAt: batchJob.created_at,
        startedAt: batchJob.started_at,
        completedAt: batchJob.completed_at
      });

    } catch (error) {
      secureLogger.error('Batch status error:', {
        error: error.message
      });

      res.status(500).json({
        error: 'Failed to retrieve batch status',
        message: error.message
      });
    }
  }
);

// Simple health check for root
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'OriginLytics API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/*',
      tokens: '/api/tokens/*',
      stripe: '/api/stripe/*',
      analyze: '/api/analyze',
      analyses: '/api/analyses/*'
    },
    frontend: config.frontend.url,
    environment: config.server.env
  });
});

// ============================================================================
// MUD GAME ROUTES AND WEBSOCKETS
// ============================================================================
// Serve MUD client files
app.use('/client', express.static(path.join(__dirname, 'mud-games/client'), {
  maxAge: '1h',
  etag: true
}));

// MUD WebSocket endpoints
const GameEngine = require('./mud-games/server/v1-traditional/game-engine');
const CommandParser = require('./mud-games/server/v1-traditional/command-parser');
const Pathfinder = require('./mud-games/server/v1-traditional/pathfinder');
const v2GameEngine = require('./mud-games/server/v2-ai-augmented/game-engine');
const v2ContextManager = require('./mud-games/server/v2-ai-augmented/context-manager');

// Initialize V1 game engine
const v1GameEngine = new GameEngine();
const v1Pathfinder = new Pathfinder(v1GameEngine);
const v1CommandParser = new CommandParser(v1GameEngine, v1Pathfinder);

// Load V1 content
const fs = require('fs');
const contentDir = path.join(__dirname, 'mud-games/server/v1-traditional/content');

try {
  const rooms = JSON.parse(fs.readFileSync(path.join(contentDir, 'rooms.json'), 'utf8'));
  const items = JSON.parse(fs.readFileSync(path.join(contentDir, 'items.json'), 'utf8'));
  const npcs = JSON.parse(fs.readFileSync(path.join(contentDir, 'npcs.json'), 'utf8'));
  const quests = JSON.parse(fs.readFileSync(path.join(contentDir, 'quests.json'), 'utf8'));
  const enemies = JSON.parse(fs.readFileSync(path.join(contentDir, 'enemies.json'), 'utf8'));

  v1GameEngine.loadContent({ rooms, items, npcs, quests, enemies });
  v1Pathfinder.buildGraph();

  console.log(`[V1 MUD] Content loaded successfully`);
} catch (err) {
  console.error(`[V1 MUD] Error loading content:`, err.message);
}

// V1 WebSocket connections
const v1Connections = new Map();

app.ws('/ws/v1', (ws, req) => {
  const playerId = req.query.playerId;
  const playerName = req.query.name || 'Player';
  
  console.log(`[V1 WebSocket] Player connected: ${playerId}`);
  v1Connections.set(playerId, ws);
  
  const player = v1GameEngine.createPlayer(playerId, playerName);
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'command' && data.command) {
        const response = v1CommandParser.parse(playerId, data.command);
        ws.send(JSON.stringify(response));
      }
    } catch (err) {
      console.error('[V1 WebSocket] Error:', err);
    }
  });
  
  ws.on('close', () => {
    console.log(`[V1 WebSocket] Player disconnected: ${playerId}`);
    v1Connections.delete(playerId);
    v1GameEngine.players.delete(playerId);
  });
  
  // Send welcome message
  const welcomeResponse = v1CommandParser.parse(playerId, 'look');
  ws.send(JSON.stringify(welcomeResponse));
});

// V2 WebSocket endpoint
const v2Connections = new Map();

app.ws('/ws/v2', (ws, req) => {
  const playerId = req.query.playerId;
  const playerName = req.query.name || 'Explorer';
  const seed = req.query.seed || `seed-${Date.now()}`;

  console.log(`[V2 WebSocket] Player connected: ${playerId} (seed: ${seed})`);
  v2Connections.set(playerId, ws);

  // Send immediate acknowledgment to prevent connection timeout
  try {
    ws.send(JSON.stringify({
      type: 'system_message',
      message: 'Initializing game world...'
    }));
  } catch (err) {
    console.error('[V2 WebSocket] Error sending acknowledgment:', err);
    return;
  }

  // Initialize game state asynchronously
  (async () => {
    try {
      const gameState = await v2GameEngine.getGameState(playerId, seed);
      const inventory = v2GameEngine.getPlayerInventory(playerId);

      // Send welcome message with game state
      ws.send(JSON.stringify({
        type: 'welcome',
        success: true,
        playerId,
        playerName,
        worldSeed: gameState.worldSeed,
        message: 'Welcome to the AI-Augmented MUD!',
        room: gameState.currentRoom,
        player: gameState.player,
        inventory: {
          items: inventory.items || [],
          equipped: inventory.equipped || {},
          credits: inventory.credits || 100,
          maxSlots: inventory.maxSlots || 50
        },
        cached: false
      }));
    } catch (err) {
      console.error('[V2 WebSocket] Error initializing game state:', err);
      console.error('[V2 WebSocket] Error stack:', err.stack);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to initialize game state: ' + err.message
        }));
      } catch (sendErr) {
        console.error('[V2 WebSocket] Failed to send error:', sendErr);
      }
    }
  })();

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      let response;

      switch (data.type) {
        case 'move':
          response = await v2GameEngine.movePlayer(playerId, data.direction);
          break;

        case 'look':
          response = await v2GameEngine.lookAround(playerId);
          break;

        case 'talk':
        case 'sayto':
          response = await v2GameEngine.talkToNPC(playerId, data.npcName, data.message);
          break;

        case 'inventory':
          const inventory = v2GameEngine.getPlayerInventory(playerId);
          response = {
            type: 'inventory_update',
            success: true,
            inventory
          };
          break;

        case 'stats':
          const stats = v2GameEngine.getPlayerTotalStats(playerId);
          response = {
            type: 'stats_update',
            success: true,
            stats
          };
          break;

        default:
          response = {
            type: 'error',
            message: `Unknown command type: ${data.type}`
          };
      }

      if (response) {
        ws.send(JSON.stringify(response));
      }
    } catch (err) {
      console.error('[V2 WebSocket] Error processing message:', err);
      console.error('[V2 WebSocket] Error stack:', err.stack);
      try {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing command: ' + err.message
        }));
      } catch (sendErr) {
        console.error('[V2 WebSocket] Failed to send error:', sendErr);
      }
    }
  });

  ws.on('close', () => {
    console.log(`[V2 WebSocket] Player disconnected: ${playerId}`);
    v2Connections.delete(playerId);
  });

  ws.on('error', (err) => {
    console.error('[V2 WebSocket] Socket error:', err);
  });
});

// Serve static files from dist folder (production frontend)
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (req, res, next) => {
  // Skip API routes, MUD routes, and static assets
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.startsWith('/client') || req.path.startsWith('/ws')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  // SECURITY: Sanitize error logs and don't expose details in production
  secureLogger.error('Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

server.listen(PORT, config.server.host, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║   🎮 OriginLytics + MUD Games Server                         ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\nExpress server running on port ${PORT}`);
  console.log(`Environment: ${config.server.env}`);
  console.log(`Frontend URL: ${config.frontend.url}`);
  console.log(`\n🕹️  V1 Traditional MUD:`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws/v1`);
  console.log(`   Client: http://localhost:${PORT}/client/v1/`);
  console.log(`\n🌃 V2 AI-Augmented MUD:`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws/v2`);
  console.log(`   Client: http://localhost:${PORT}/client/v2/`);
  console.log(`\n📚 MUD Hub: http://localhost:${PORT}/mushclient-to-agents/`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
});