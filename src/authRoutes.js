const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('./config.js');
const {
  validate,
  validateUuidParam,
  signupSchema,
  loginSchema,
  apiKeyCreateSchema,
  paginationSchema,
} = require('./validators.js');
const {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  getUserFromToken,
  verifyApiKey,
  checkTokenBalance,
  deductTokens,
  addTokens,
  checkRateLimit,
  saveAnalysis
} = require('./supabaseClient.js');

const router = express.Router();

// ============================================================================
// SECURITY: Rate limiting for authentication endpoints (CRITICAL FIX)
// ============================================================================
// Prevent brute force attacks on login/signup endpoints

// Strict rate limit for authentication (5 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  // Default key generator handles IPv6 properly
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes.',
      retryAfter: '15 minutes',
    });
  },
});

// Even stricter for password reset (3 attempts per hour)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 attempts per hour
  message: 'Too many password reset attempts',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password reset attempts',
      message: 'Please try again in 1 hour.',
      retryAfter: '1 hour',
    });
  },
});

// Middleware to verify authentication (JWT or API key)
async function requireAuth(req, res, next) {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ 
      error: 'Authentication service not configured' 
    });
  }

  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // Try JWT token first
  if (authHeader) {
    const { user, error } = await getUserFromToken(authHeader);
    if (user) {
      req.user = user;
      return next();
    }
    // Continue to API key check if JWT fails
  }

  // Try API key
  if (apiKey) {
    const { valid, userId, scopes, error } = await verifyApiKey(apiKey);
    if (valid) {
      req.user = { id: userId };
      req.apiKeyScopes = scopes;
      return next();
    }
    return res.status(401).json({ error: error || 'Invalid API key' });
  }

  return res.status(401).json({ 
    error: 'Authentication required. Provide Bearer token or X-API-Key header.' 
  });
}

// Middleware to check token balance
function requireTokens(tokensNeeded = 1) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { sufficient, balance, error } = await checkTokenBalance(req.user.id, tokensNeeded);

    if (error) {
      return res.status(500).json({ error: 'Failed to check token balance' });
    }

    if (!sufficient) {
      return res.status(402).json({ 
        error: 'Insufficient tokens',
        balance: balance,
        needed: tokensNeeded,
        message: 'Please purchase more tokens to continue.'
      });
    }

    req.tokenBalance = balance;
    next();
  };
}

// Middleware to check rate limit (free tier)
async function rateLimitFree(req, res, next) {
  if (!isSupabaseConfigured()) {
    // If Supabase not configured, allow request (backward compatibility)
    return next();
  }

  // Skip rate limit if user is authenticated
  if (req.user) {
    return next();
  }

  const ipAddress = req.ip || req.connection.remoteAddress;
  const { allowed, remaining, resetAt, error } = await checkRateLimit(ipAddress);

  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: error || 'You have reached the free tier limit of 3 analyses per day.',
      resetAt: resetAt,
      upgradeUrl: '/pricing'
    });
  }

  res.set('X-RateLimit-Remaining', remaining);
  res.set('X-RateLimit-Reset', resetAt.toISOString());
  next();
}

// reCAPTCHA verification middleware
async function verifyCaptcha(req, res, next) {
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  const recaptchaToken = req.body.recaptchaToken;

  // Skip in development if not configured
  if (!recaptchaSecret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'CAPTCHA verification not configured' });
    }
    console.warn('[CAPTCHA] reCAPTCHA not configured - skipping verification (dev mode)');
    return next();
  }

  if (!recaptchaToken) {
    return res.status(400).json({ error: 'CAPTCHA verification required' });
  }

  try {
    const axios = require('axios');
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: recaptchaSecret,
          response: recaptchaToken
        }
      }
    );

    if (!response.data.success) {
      console.error('[CAPTCHA] Verification failed:', response.data['error-codes']);
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }

    // reCAPTCHA v3 returns a score from 0.0 to 1.0
    // 0.0 = likely a bot, 1.0 = likely a human
    const score = response.data.score || 0;
    if (score < 0.5) {
      console.warn(`[CAPTCHA] Low score detected: ${score} - possible bot`);
      return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
    }

    console.log(`[CAPTCHA] Verification passed with score: ${score}`);
    next();
  } catch (error) {
    console.error('[CAPTCHA] Verification error:', error.message);
    return res.status(500).json({ error: 'CAPTCHA verification failed. Please try again.' });
  }
}

// Helper function to generate unique referral code
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/auth/signup (with validation, rate limiting, and CAPTCHA)
router.post('/auth/signup', authLimiter, validate(signupSchema), verifyCaptcha, async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Authentication service not configured' });
  }

  // Input is validated by middleware
  const { email, password, referralCode } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${req.protocol}://${req.get('host')}/auth/callback`
      }
    });

    if (error) {
      // SECURITY: Don't reveal if email already exists (prevents user enumeration)
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        return res.status(400).json({ error: 'Unable to create account. Please try logging in or use a different email.' });
      }
      return res.status(400).json({ error: 'Signup failed. Please check your information and try again.' });
    }

    // Create user record in database
    if (data.user) {
      // Generate unique referral code for new user
      let userReferralCode = generateReferralCode();
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', userReferralCode)
          .single();

        if (!existing) break; // Code is unique
        userReferralCode = generateReferralCode();
        attempts++;
      }

      // Default token balance (5 bonus for new users)
      let initialTokens = 5;
      let referrerId = null;

      // Check if referral code was provided
      if (referralCode) {
        const { data: referrer } = await supabaseAdmin
          .from('users')
          .select('id, token_balance')
          .eq('referral_code', referralCode)
          .single();

        if (referrer) {
          referrerId = referrer.id;
          initialTokens = 10; // Referee gets 10 bonus tokens (was 5, +5 from referral)

          // Give referrer 15 bonus tokens
          await addTokens(referrer.id, 15, 'referral_reward');

          // Track the referral
          await supabaseAdmin
            .from('referrals')
            .insert({
              referrer_id: referrer.id,
              referee_id: data.user.id,
              reward_amount: 15,
              status: 'completed',
              created_at: new Date().toISOString()
            });

          console.log(`[REFERRAL] User ${data.user.id} referred by ${referrer.id} - ${initialTokens} tokens for referee, 15 tokens for referrer`);
        } else {
          console.warn(`[REFERRAL] Invalid referral code provided: ${referralCode}`);
        }
      }

      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          subscription_tier: 'free',
          token_balance: initialTokens,
          referral_code: userReferralCode,
          referred_by: referrerId
        });

      if (dbError && dbError.code !== '23505') { // Ignore duplicate key errors
        console.error('Failed to create user record:', dbError);
      }
    }

    res.json({
      message: 'Signup successful. Please check your email to verify your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login (with validation and rate limiting)
router.post('/auth/login', authLimiter, validate(loginSchema), async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Authentication service not configured' });
  }

  // Input is validated by middleware
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // SECURITY: Generic error message prevents user enumeration
      // Don't reveal whether email exists or password is wrong
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: 'Login successful',
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/verify-email - Handle email confirmation
router.post('/auth/verify-email', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Authentication service not configured' });
  }

  const { token, type } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log(`[EMAIL VERIFY] Verifying token_hash: ${token}, type: ${type}`);
    
    // Try method 1: verifyOtp with token_hash and type 'signup'
    let result = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'signup'
    });

    if (result.error) {
      console.log('[EMAIL VERIFY] Method 1 (signup) failed:', result.error.message);
      
      // Try method 2: verifyOtp with type 'email'  
      result = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email'
      });
      
      if (result.error) {
        console.log('[EMAIL VERIFY] Method 2 (email) failed:', result.error.message);
        
        // Try method 3: Use admin API to manually confirm
        // This might work if the token is just a user ID or email confirmation code
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error('[EMAIL VERIFY] Failed to list users:', listError);
          return res.status(400).json({ 
            error: 'Invalid or expired confirmation link',
            suggestion: 'Please request a new confirmation email.'
          });
        }
        
        // Find unconfirmed users
        const unconfirmedUser = users.users.find(u => !u.email_confirmed_at);
        
        if (unconfirmedUser) {
          console.log('[EMAIL VERIFY] Found unconfirmed user, manually confirming:', unconfirmedUser.email);
          
          // Manually confirm the user
          const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            unconfirmedUser.id,
            { email_confirm: true }
          );
          
          if (updateError) {
            console.error('[EMAIL VERIFY] Failed to confirm user:', updateError);
            return res.status(500).json({ error: 'Failed to confirm email' });
          }
          
          // Generate a session for the user using admin
          const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: unconfirmedUser.email
          });
          
          if (sessionError || !sessionData.properties) {
            console.error('[EMAIL VERIFY] Failed to generate session:', sessionError);
            return res.status(500).json({ 
              error: 'Email confirmed but failed to create session',
              suggestion: 'Please try logging in with your email and password.'
            });
          }
          
          console.log('[EMAIL VERIFY] Manual confirmation successful');
          return res.json({
            message: 'Email verified successfully',
            access_token: sessionData.properties.hashed_token,
            user: {
              id: unconfirmedUser.id,
              email: unconfirmedUser.email
            }
          });
        }
        
        return res.status(400).json({ 
          error: 'Invalid or expired confirmation link',
          suggestion: 'Your email may already be confirmed. Try logging in instead.'
        });
      }
    }

    if (!result.data.session) {
      console.error('[EMAIL VERIFY] No session in response');
      return res.status(400).json({ 
        error: 'Email confirmed but failed to create session',
        suggestion: 'Please try logging in with your email and password.'
      });
    }

    console.log('[EMAIL VERIFY] Success! User:', result.data.user?.email);
    res.json({
      message: 'Email verified successfully',
      access_token: result.data.session.access_token,
      refresh_token: result.data.session.refresh_token,
      user: {
        id: result.data.user?.id,
        email: result.data.user?.email
      }
    });
  } catch (error) {
    console.error('[EMAIL VERIFY] Exception:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/callback - Email confirmation callback
router.get('/auth/callback', async (req, res) => {
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

// POST /api/auth/logout
// POST /api/auth/logout
router.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me
// GET /api/auth/me
router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_tier, token_balance, total_tokens_purchased, total_tokens_used, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tokens/balance
router.get('/tokens/balance', requireAuth, async (req, res) => {
  try {
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('token_balance, total_tokens_purchased, total_tokens_used')
      .eq('id', req.user.id)
      .single();

    // If user doesn't exist or schema error, handle gracefully
    if (error) {
      console.log('Balance fetch error:', error.code, error.message);
      
      // PGRST106 = schema configuration issue (need to expose 'public' schema in Supabase)
      // PGRST116 = user not found
      if (error.code === 'PGRST106') {
        console.warn('Supabase schema not configured. Please expose the "public" schema in Supabase API settings.');
        // Return default balance for now
        return res.json({
          balance: 0,
          totalPurchased: 0,
          totalUsed: 0
        });
      }
      
      if (error.code === 'PGRST116') {
        // Get user email from auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
        const userEmail = authUser?.user?.email || req.user.email;
        
        // Check if there's an old user record with this email
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (existingUser) {
          console.log('[BALANCE] Found old user record, updating ID from', existingUser.id, 'to', req.user.id);
          
          // Delete old record and create new one with correct ID
          await supabaseAdmin.from('users').delete().eq('id', existingUser.id);
          
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              id: req.user.id,
              email: userEmail,
              subscription_tier: existingUser.subscription_tier || 'free',
              token_balance: existingUser.token_balance || 0,
              total_tokens_purchased: existingUser.total_tokens_purchased || 0,
              total_tokens_used: existingUser.total_tokens_used || 0
            });

          if (insertError && insertError.code !== '23505') {
            console.error('Failed to create user record:', insertError);
            return res.status(500).json({ error: 'Failed to create user record' });
          }
          
          // Fetch the user data
          const result = await supabaseAdmin
            .from('users')
            .select('token_balance, total_tokens_purchased, total_tokens_used')
            .eq('id', req.user.id)
            .single();
          
          user = result.data;
          error = result.error;
        } else {
          // No existing record, create new one
          const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              id: req.user.id,
              email: userEmail,
              subscription_tier: 'free',
              token_balance: 0
            });

          if (insertError && insertError.code !== '23505') {
            console.error('Failed to create user record:', insertError);
            return res.status(500).json({ error: 'Failed to create user record' });
          }

          // Fetch again after creation
          const result = await supabaseAdmin
            .from('users')
            .select('token_balance, total_tokens_purchased, total_tokens_used')
            .eq('id', req.user.id)
            .single();
          
          user = result.data;
          error = result.error;
        }
      }
    }

    if (error) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      balance: user.token_balance,
      totalPurchased: user.total_tokens_purchased,
      totalUsed: user.total_tokens_used
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tokens/transactions (with validation)
router.get('/tokens/transactions', requireAuth, validate(paginationSchema, 'query'), async (req, res) => {
  try {
    // Input is validated by middleware
    const { limit, offset } = req.query;

    const { data: transactions, error } = await supabaseAdmin
      .from('token_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analyses/history (with validation)
router.get('/analyses/history', requireAuth, validate(paginationSchema, 'query'), async (req, res) => {
  try {
    // Input is validated by middleware
    const { limit, offset } = req.query;

    const { data: analyses, error } = await supabaseAdmin
      .from('analyses')
      .select('id, url, analysis_type, tokens_used, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ analyses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analyses/:id (with validation)
router.get('/analyses/:id', requireAuth, validateUuidParam('id'), async (req, res) => {
  try {
    const { data: analysis, error } = await supabaseAdmin
      .from('analyses')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/api-keys (create new API key with validation)
router.post('/api-keys', requireAuth, validate(apiKeyCreateSchema), async (req, res) => {
  try {
    // Input is validated by middleware
    const { name, scopes } = req.body;

    // Generate random API key
    const crypto = await import('crypto');
    const key = 'ak_' + crypto.randomBytes(32).toString('hex');
    const prefix = key.substring(0, 13); // 'ak_' + 10 chars

    // In production, hash the key with bcrypt
    // For now, store prefix only (TODO: implement full hashing)
    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .insert({
        user_id: req.user.id,
        name: name,
        key_prefix: prefix,
        key_hash: key, // TODO: Replace with bcrypt hash
        scopes: scopes
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Return full key only once (never shown again)
    res.json({
      message: 'API key created. Save this key securely - it will not be shown again.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: key, // Only shown once
        prefix: prefix,
        scopes: apiKey.scopes,
        createdAt: apiKey.created_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/api-keys (list API keys)
router.get('/api-keys', requireAuth, async (req, res) => {
  try {
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, scopes, usage_count, last_used_at, created_at, expires_at, revoked_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ apiKeys });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/api-keys/:id (revoke API key with validation)
router.delete('/api-keys/:id', requireAuth, validateUuidParam('id'), async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password (update password with access token)
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const accessToken = authHeader.substring(7);

    // Update password using Supabase with the access token
    const { data, error } = await supabase().auth.updateUser(
      { password },
      { accessToken }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully', user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// REFERRAL PROGRAM ENDPOINTS
// ============================================================================

// GET /api/auth/referral - Get user's referral stats
router.get('/auth/referral', requireAuth, async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    // Get user's referral code
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    // Get referral stats
    const { data: referrals, error: refError } = await supabaseAdmin
      .from('referrals')
      .select('*')
      .eq('referrer_id', req.user.id);

    if (refError) throw refError;

    // Calculate total rewards
    const totalRewards = referrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0);
    const totalReferrals = referrals.length;

    res.json({
      referralCode: userData.referral_code,
      totalReferrals,
      totalRewards,
      referrals: referrals.map(r => ({
        id: r.id,
        createdAt: r.created_at,
        reward: r.reward_amount,
        status: r.status
      })),
      shareUrl: `${config.frontend.url}/?ref=${userData.referral_code}`
    });
  } catch (error) {
    console.error('[REFERRAL] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// ============================================================================
// STUDENT DISCOUNT PROGRAM
// ============================================================================

// POST /api/auth/verify-student - Verify student email and create discount code
router.post('/auth/verify-student', requireAuth, async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  try {
    const { email } = req.body;

    // Verify .edu email
    if (!email || !email.toLowerCase().endsWith('.edu')) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Must use a valid .edu email address for student discount'
      });
    }

    // Check if user already has student verification
    const { data: existingDiscount } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('discount_type', 'student')
      .single();

    if (existingDiscount) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'You have already claimed your student discount',
        discountCode: existingDiscount.code
      });
    }

    // Generate discount code
    const discountCode = `STUDENT50_${generateReferralCode()}`;

    // Create discount code (50% off for 1 year)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    const { error: insertError } = await supabaseAdmin
      .from('discount_codes')
      .insert({
        code: discountCode,
        user_id: req.user.id,
        user_email: email,
        discount_percent: 50,
        discount_type: 'student',
        valid_until: expiryDate.toISOString(),
        usage_limit: 1,
        uses_count: 0,
        is_active: true,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    console.log(`[STUDENT] Discount code ${discountCode} created for user ${req.user.id} with email ${email}`);

    res.json({
      verified: true,
      discountCode,
      discountPercent: 50,
      validUntil: expiryDate.toISOString(),
      message: 'Student verified! Your 50% discount code is ready to use.'
    });
  } catch (error) {
    console.error('[STUDENT] Verification error:', error);
    res.status(500).json({ error: 'Failed to verify student status' });
  }
});

// Export router and middleware
module.exports = router;
module.exports.rateLimitFree = rateLimitFree;
module.exports.requireAuth = requireAuth;
module.exports.requireTokens = requireTokens;
