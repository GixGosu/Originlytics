// Load environment variables FIRST before any other modules
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const { summarizeContent, analyzeTiered } = require('./analysis.js');
const { rateLimitMiddleware, shouldRateLimit, recordAnalysis, getClientIP } = require('./rateLimiter.js');
const { createClient } = require('@supabase/supabase-js');

console.log('=== STARTING SERVER ===');
console.log('PORT:', process.env.PORT);
console.log('PWD:', process.cwd());
console.log('__dirname:', __dirname);

const app = express();
const PORT = process.env.PORT || 8080;

console.log('Using port:', PORT);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add rate limiting middleware
app.use(rateLimitMiddleware);

// Force HTTPS redirect for production (works with AWS ELB)
app.use((req, res, next) => {
  // In production, redirect all HTTP requests to HTTPS
  if (process.env.NODE_ENV === 'production' && req.protocol === 'http') {
    const host = req.headers.host;
    if (host) {
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  next();
});

// CORS middleware
app.use((req, res, next) => {
  // SECURITY: In production, restrict CORS to specific origins
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://originlytics.com', 'https://www.originlytics.com']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Security headers middleware
app.use((req, res, next) => {
  // SECURITY: Comprehensive security headers
  
  // Prevent clickjacking
  res.header('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (legacy browsers)
  res.header('X-XSS-Protection', '1; mode=block');
  
  // Force HTTPS (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",  // React needs unsafe-eval in dev, reCAPTCHA needs google.com/gstatic.com
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  res.header('Content-Security-Policy', cspDirectives.join('; '));
  
  // Referrer policy
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (restrict features)
  res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});

// Serve static files
const distPath = path.join(__dirname, '..', 'dist');
console.log('Dist path:', distPath, 'exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('Static serving enabled');
}

// Health check
app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({ status: 'ok', port: PORT, time: new Date().toISOString() });
});

// API endpoint with tier-based analysis and token enforcement
app.post('/api/analyze', async (req, res) => {
  const clientIP = getClientIP(req);
  console.log(`[API] Analysis request from IP: ${clientIP}`);
  
  try {
    const { url, language, useTokens } = req.body;
    // SECURITY: NEVER trust userId from client - always verify JWT server-side
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    let isAuthenticated = false;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Analyzing URL:', url);
    
    // SECURITY: Verify JWT token server-side if provided
    if (authToken && useTokens) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data: { user }, error } = await supabase.auth.getUser(authToken);
          
          if (error) {
            console.warn('[Auth] Invalid token:', error.message);
            // Continue as free tier - don't expose auth errors to client
          } else if (user) {
            userId = user.id;
            isAuthenticated = true;
            // SECURITY: Don't log userId in production (GDPR/privacy)
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Auth] Verified user: ${userId}`);
            } else {
              console.log('[Auth] User verified');
            }
          }
        }
      } catch (error) {
        console.error('[Auth] Token verification failed:', error.message);
        // Continue as free tier - fail securely
      }
    }
    
    // ========================================================================
    // STEP 1: DEFAULT TO FREE TIER
    // All requests default to FREE tier unless user explicitly opts into PAID
    // ========================================================================
    let tier = 'free';
    let tokenBalance = 0;
    let hasPaidTokens = false;

    // TEST MODE: Allow forcing paid tier for testing via environment variable ONLY
    // SECURITY: Never allow client to control test mode via request body
    const testMode = process.env.TEST_PAID_TIER === 'true';
    if (testMode) {
        tier = 'paid';
        console.log('[TEST MODE] Forcing PAID tier for testing premium metrics (ENV VAR ONLY)');
    }

    // Only check for paid tier if user is authenticated AND explicitly requests it
    // SECURITY: userId must be verified from JWT token above, never from client body
    if (useTokens && userId && isAuthenticated && !testMode) {
      // Check Supabase for user's token balance
      // SECURITY: Use admin client to bypass RLS since we already verified JWT
      try {
        if (supabaseAdmin) {
          const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('token_balance')
            .eq('id', userId)
            .single();
          
          if (error) {
            console.error('[Token Check] Supabase error:', error);
          } else if (user && user.token_balance > 0) {
            tokenBalance = user.token_balance;
            hasPaidTokens = true;
            tier = 'paid';
            // SECURITY: Don't log userId in production
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Token Check] User ${userId} has ${tokenBalance} tokens - using PAID tier`);
            } else {
              console.log(`[Token Check] Paid tier enabled`);
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Token Check] User ${userId} has no tokens - using FREE tier`);
            } else {
              console.log('[Token Check] Free tier (no tokens)');
            }
          }
        } else {
          console.log('[Token Check] Supabase not configured, using free tier');
        }
      } catch (error) {
        console.error('[Token Check] Error checking tokens:', error.message);
        // Continue with free tier on error
      }
    }
    
    // ========================================================================
    // STEP 2: Check rate limits (only for free tier)
    // ========================================================================
    const rateLimitCheck = shouldRateLimit(req, hasPaidTokens);
    
    if (rateLimitCheck.limited) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitCheck.message,
        remaining: 0,
        resetTime: rateLimitCheck.resetTime,
        tier: 'free',
        upgradeMessage: 'Purchase tokens for unlimited analyses'
      });
    }
    
    // ========================================================================
    // STEP 3: Run analysis (tier-specific)
    // ========================================================================
    console.log(`[Analysis] Starting ${tier.toUpperCase()} tier analysis`);
    
    const result = await analyzeTiered(url, language, {
      tier: tier,
      userId: userId
    });
    
    // ========================================================================
    // STEP 4: Record usage and deduct tokens
    // ========================================================================
    
    // Record analysis for rate limiting (free tier only)
    recordAnalysis(req, hasPaidTokens);
    
    // Deduct token for paid tier
    if (hasPaidTokens && userId) {
      try {
        // SECURITY: Use admin client for token deduction (already verified user)
        if (supabaseAdmin) {
          // Deduct 1 token
          const { error: deductError } = await supabaseAdmin
            .from('users')
            .update({ token_balance: tokenBalance - 1 })
            .eq('id', userId);
          
          if (deductError) {
            console.error('[Token Deduct] Error:', deductError);
          } else {
            // SECURITY: Don't log userId in production
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[Token Deduct] Deducted 1 token from user ${userId}, new balance: ${tokenBalance - 1}`);
            } else {
              console.log(`[Token Deduct] Token deducted, new balance: ${tokenBalance - 1}`);
            }
            
            // Record transaction
            const { error: txError } = await supabaseAdmin
              .from('token_transactions')
              .insert({
                user_id: userId,
                amount: -1,
                transaction_type: 'usage',
                balance_before: tokenBalance,
                balance_after: tokenBalance - 1,
                description: 'AI content analysis'
              });
            
            if (txError) {
              console.error('[Token Transaction] Error recording:', txError);
            }
            
            // Record analysis
            const { error: analysisError } = await supabaseAdmin
              .from('analyses')
              .insert({
                user_id: userId,
                url: url,
                analysis_type: 'deep',
                tokens_used: 1,
                result: result
              });
            
            if (analysisError) {
              console.error('[Analysis Record] Error:', analysisError);
            }
          }
        }
      } catch (error) {
        console.error('[Token Management] Error:', error.message);
        // Continue even if token deduction fails
      }
    }
    
    // ========================================================================
    // STEP 5: Add tier info to response
    // ========================================================================
    const response = {
      ...result,
      tier: tier,
      tokenInfo: hasPaidTokens ? {
        tokensUsed: 1,
        remainingTokens: tokenBalance - 1
      } : {
        remainingFreeAnalyses: rateLimitCheck.remaining - 1,
        resetTime: req.rateLimit?.resetTime
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      summary: 'Analysis failed due to an error',
      keyPoints: 'Unable to extract key points',
      translation: 'Translation unavailable',
      aiLikelihood: { scores: {}, notes: 'Analysis failed' },
      toxicityScore: 0
    });
  }
});

// Serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'dist/index.html');
  console.log('Request for:', req.path, 'serving:', indexPath);

  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`<h1>Server Running</h1><p>Port: ${PORT}</p><p>Time: ${new Date().toISOString()}</p><p>Dist exists: ${fs.existsSync(distPath)}</p>`);
  }
});

console.log('Starting server...');
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});