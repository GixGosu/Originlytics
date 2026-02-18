const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('Warning: SUPABASE_URL not set. Token features will be disabled.');
}

if (!supabaseAnonKey) {
  console.warn('Warning: SUPABASE_ANON_KEY not set. Token features will be disabled.');
}

// Singleton instances for connection pooling
let supabaseInstance = null;
let supabaseAdminInstance = null;

/**
 * Get Supabase client instance (singleton pattern for connection pooling)
 * This client respects Row Level Security (RLS) policies
 * Use for frontend/authenticated requests
 *
 * @returns {Object|null} Supabase client or null if not configured
 */
function getSupabaseClient() {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    console.log('[Supabase] Creating new client instance (singleton)');
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Server-side, no session persistence needed
        detectSessionInUrl: false, // Server-side, no URL session detection
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'originlytics',
        },
      },
    });
  }
  return supabaseInstance;
}

/**
 * Get Supabase admin client instance (singleton pattern for connection pooling)
 * This client bypasses Row Level Security (RLS) policies
 * Use ONLY in server-side code for trusted operations
 *
 * @returns {Object|null} Supabase admin client or null if not configured
 */
function getSupabaseAdmin() {
  if (!supabaseAdminInstance && supabaseUrl && supabaseServiceKey) {
    console.log('[Supabase] Creating new admin client instance (singleton)');
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'originlytics-admin',
        },
      },
    });
  }
  return supabaseAdminInstance;
}

// Export singleton instances (initialized on first access)
const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdmin();

// Helper to check if Supabase is configured
function isSupabaseConfigured() {
  return supabase !== null && supabaseAdmin !== null;
}

/**
 * Health check for Supabase connection
 * Performs a lightweight query to verify database connectivity
 *
 * @returns {Promise<Object>} Health check result with status and details
 */
async function checkSupabaseHealth() {
  const startTime = Date.now();

  try {
    if (!supabase) {
      return {
        status: 'not_configured',
        healthy: false,
        message: 'Supabase client not configured',
        responseTime: 0,
      };
    }

    // Perform lightweight query (just count users, limit 1 for speed)
    const { data, error, count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true }); // head: true means no data returned, just metadata

    const responseTime = Date.now() - startTime;

    if (error) {
      console.error('[Supabase Health] Query failed:', error.message);
      return {
        status: 'unhealthy',
        healthy: false,
        message: error.message,
        responseTime,
        error: error.code || 'unknown',
      };
    }

    // Connection successful
    return {
      status: 'healthy',
      healthy: true,
      message: 'Database connection successful',
      responseTime,
      userCount: count || 0,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[Supabase Health] Health check failed:', error.message);
    return {
      status: 'error',
      healthy: false,
      message: error.message,
      responseTime,
      error: error.name || 'unknown',
    };
  }
}

/**
 * Get connection pool statistics
 * Useful for monitoring and debugging
 *
 * @returns {Object} Connection pool stats
 */
function getConnectionStats() {
  return {
    clientInitialized: supabaseInstance !== null,
    adminInitialized: supabaseAdminInstance !== null,
    configured: isSupabaseConfigured(),
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'not set',
  };
}

// Helper to get user from JWT token
async function getUserFromToken(authHeader) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user, error };
  } catch (error) {
    return { user: null, error: error.message };
  }
}

// Helper to verify API key
async function verifyApiKey(apiKey) {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  if (!apiKey || !apiKey.startsWith('ak_')) {
    return { valid: false, error: 'Invalid API key format' };
  }

  try {
    // Extract prefix (first 10 chars after ak_)
    const prefix = apiKey.substring(0, 13); // 'ak_' + 10 chars

    // Find API key by prefix
    const { data: keys, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key_prefix', prefix)
      .is('revoked_at', null)
      .single();

    if (error || !keys) {
      return { valid: false, error: 'API key not found' };
    }

    // In production, verify full key hash with bcrypt
    // For now, just check prefix match
    // TODO: Implement bcrypt verification

    // Check expiration
    if (keys.expires_at && new Date(keys.expires_at) < new Date()) {
      return { valid: false, error: 'API key expired' };
    }

    // Update last used timestamp
    await supabaseAdmin
      .from('api_keys')
      .update({ 
        last_used_at: new Date().toISOString(),
        usage_count: keys.usage_count + 1
      })
      .eq('id', keys.id);

    return { 
      valid: true, 
      userId: keys.user_id,
      scopes: keys.scopes 
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Helper to check token balance
async function checkTokenBalance(userId, tokensNeeded = 1) {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();

    if (error) {
      return { sufficient: false, balance: 0, error: error.message };
    }

    return {
      sufficient: user.token_balance >= tokensNeeded,
      balance: user.token_balance,
      needed: tokensNeeded
    };
  } catch (error) {
    return { sufficient: false, balance: 0, error: error.message };
  }
}

// Helper to deduct tokens for analysis
async function deductTokens(userId, tokensToDeduct, analysisId, description = 'Token deduction') {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    // Call database function (atomic operation)
    const { data, error } = await supabaseAdmin.rpc('deduct_tokens', {
      p_user_id: userId,
      p_tokens: tokensToDeduct,
      p_analysis_id: analysisId,
      p_description: description
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, newBalance: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper to add tokens (purchase, bonus, refund)
// Note: Function now expects description before metadata to match database function
async function addTokens(userId, tokensToAdd, transactionType, description = 'Token credit', metadata = {}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    // Call database function (atomic operation)
    // The database function returns the new balance as INTEGER
    const { data, error } = await supabaseAdmin.rpc('add_tokens', {
      p_user_id: userId,
      p_tokens: tokensToAdd,
      p_transaction_type: transactionType,
      p_payment_id: metadata.stripe_session_id || null,
      p_description: description,
      p_metadata: metadata
    });

    if (error) {
      console.error('[Supabase] add_tokens error:', error);
      return { success: false, error: error.message };
    }

    // data is the new balance (INTEGER) returned from the function
    return { success: true, newBalance: data };
  } catch (error) {
    console.error('[Supabase] add_tokens exception:', error);
    return { success: false, error: error.message };
  }
}

// Helper to check rate limit for free tier
async function checkRateLimit(ipAddress, maxPerDay = 3) {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    // Check existing rate limit record
    const { data: limits, error: queryError } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .gt('window_end', new Date().toISOString())
      .order('window_start', { ascending: false })
      .limit(1);

    if (queryError) {
      return { allowed: false, error: queryError.message };
    }

    // No active window found - create new one
    if (!limits || limits.length === 0) {
      const windowStart = new Date();
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const { error: insertError } = await supabaseAdmin
        .from('rate_limits')
        .insert({
          ip_address: ipAddress,
          analysis_count: 1,
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString()
        });

      if (insertError) {
        return { allowed: false, error: insertError.message };
      }

      return { 
        allowed: true, 
        remaining: maxPerDay - 1,
        resetAt: windowEnd 
      };
    }

    // Active window exists - check count
    const currentLimit = limits[0];
    
    if (currentLimit.analysis_count >= maxPerDay) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(currentLimit.window_end),
        error: 'Rate limit exceeded. Upgrade to Pro for unlimited analyses.'
      };
    }

    // Increment count
    const { error: updateError } = await supabaseAdmin
      .from('rate_limits')
      .update({ analysis_count: currentLimit.analysis_count + 1 })
      .eq('id', currentLimit.id);

    if (updateError) {
      return { allowed: false, error: updateError.message };
    }

    return {
      allowed: true,
      remaining: maxPerDay - currentLimit.analysis_count - 1,
      resetAt: new Date(currentLimit.window_end)
    };
  } catch (error) {
    return { allowed: false, error: error.message };
  }
}

// Helper to save analysis result
async function saveAnalysis(userId, url, analysisType, result, tokensUsed = 0, ipAddress = null) {
  if (!supabaseAdmin) {
    throw new Error('Supabase not configured');
  }

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days retention

    const { data, error } = await supabaseAdmin
      .from('analyses')
      .insert({
        user_id: userId,
        url: url,
        analysis_type: analysisType,
        result: result,
        tokens_used: tokensUsed,
        ip_address: ipAddress,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, analysisId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

console.log('Supabase client initialized:', {
  url: supabaseUrl || 'Not configured',
  clientReady: supabase !== null,
  adminReady: supabaseAdmin !== null
});

// CommonJS exports
module.exports = {
  supabase,
  supabaseAdmin,
  isSupabaseConfigured,
  checkSupabaseHealth,
  getConnectionStats,
  getUserFromToken,
  verifyApiKey,
  checkTokenBalance,
  deductTokens,
  addTokens,
  checkRateLimit,
  saveAnalysis
};
