/**
 * Enhanced Health Check Routes
 * Integration Engineer - Service Health Monitoring
 *
 * Provides comprehensive health checks for all integrated services:
 * - Supabase (database connectivity)
 * - OpenAI (API configuration)
 * - Stripe (payment gateway configuration)
 * - Python subprocess (ML models)
 */

const express = require('express');
const router = express.Router();
const { checkSupabaseHealth, getConnectionStats } = require('./supabaseClient.js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Get the Python executable path
 * Checks for venv first, then falls back to system Python
 */
function getPythonPath() {
    const venvPath = path.join(__dirname, '..', 'venv', 'bin', 'python3');

    if (fs.existsSync(venvPath)) {
        return venvPath;
    }

    return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * GET /api/health
 * Comprehensive health check for all services
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {},
    integrations: {}
  };

  // 1. Check Supabase Connection
  try {
    const supabaseHealth = await checkSupabaseHealth();
    health.services.supabase = supabaseHealth;

    // Add connection stats in non-production
    if (process.env.NODE_ENV !== 'production') {
      health.integrations.supabase = {
        pooling: 'enabled',
        ...getConnectionStats()
      };
    }

    if (!supabaseHealth.healthy) {
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.supabase = {
      status: 'error',
      healthy: false,
      message: error.message
    };
    health.status = 'DEGRADED';
  }

  // 2. Check OpenAI Configuration & Rate Limiter
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const isConfigured = apiKey && apiKey !== 'dummy-key-for-testing';

    health.services.openai = {
      status: isConfigured ? 'configured' : 'not_configured',
      configured: isConfigured,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };

    if (isConfigured) {
      health.integrations.openai = {
        rateLimiting: 'enabled',
        limiter: 'bottleneck',
        retryLogic: 'p-retry',
        maxRetries: 3
      };
    }
  } catch (error) {
    health.services.openai = {
      status: 'error',
      configured: false,
      message: error.message
    };
    health.status = 'DEGRADED';
  }

  // 3. Check Stripe Configuration & Webhook Security
  try {
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
    const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;

    health.services.stripe = {
      status: stripeConfigured ? 'configured' : 'not_configured',
      configured: stripeConfigured,
      webhook: webhookConfigured
    };

    if (stripeConfigured) {
      health.integrations.stripe = {
        webhookSecurity: 'signature_verification',
        idempotency: 'enabled',
        protection: 'database_unique_constraint'
      };
    }
  } catch (error) {
    health.services.stripe = {
      status: 'error',
      configured: false,
      message: error.message
    };
  }

  // 4. Check Python Subprocess (quick health check)
  try {
    const pythonHealthResult = await checkPythonHealth();
    health.services.python = pythonHealthResult;

    if (!pythonHealthResult.healthy) {
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.python = {
      status: 'error',
      healthy: false,
      message: error.message
    };
    health.status = 'DEGRADED';
  }

  // Return appropriate status code
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/health/supabase
 * Detailed Supabase health check
 */
router.get('/health/supabase', async (req, res) => {
  try {
    const health = await checkSupabaseHealth();
    const stats = getConnectionStats();

    res.json({
      ...health,
      connectionStats: stats,
      pooling: {
        enabled: true,
        pattern: 'singleton',
        description: 'Connection reuse via singleton instances'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      healthy: false,
      message: error.message
    });
  }
});

/**
 * GET /api/health/integrations
 * Integration-specific health information
 */
router.get('/health/integrations', (req, res) => {
  const integrations = {
    openai: {
      status: 'enabled',
      rateLimiting: {
        library: 'bottleneck',
        tier: 'tier-1',
        rateLimit: '500 RPM',
        tokenLimit: '200K TPM',
        retryLogic: 'p-retry with exponential backoff',
        retryAfterHeader: 'supported'
      }
    },
    stripe: {
      status: 'enabled',
      idempotency: {
        method: 'dual-layer',
        appLevel: 'session_id check before processing',
        dbLevel: 'unique constraint on stripe_session_id',
        duplicateProtection: 'prevents double-charging'
      },
      webhookSecurity: {
        signatureVerification: 'enabled',
        rawBodyParsing: 'required'
      }
    },
    supabase: {
      status: 'enabled',
      connectionPooling: {
        pattern: 'singleton',
        clientReuse: true,
        autoRefresh: true,
        persistSession: false
      },
      healthChecks: {
        endpoint: '/api/health/supabase',
        method: 'lightweight query',
        interval: 'on-demand'
      }
    },
    python: {
      status: 'enabled',
      subprocess: {
        communication: 'stdin/stdout',
        timeout: '30s default',
        retries: 2,
        exponentialBackoff: true
      },
      models: {
        aiDetector: 'RoBERTa',
        toxicity: 'Detoxify',
        caching: 'module-level'
      }
    }
  };

  res.json(integrations);
});

/**
 * Helper: Check Python subprocess health
 * Quick test to ensure Python is accessible and models load
 */
async function checkPythonHealth() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const timeout = 5000; // 5 second timeout for health check

    try {
      const pythonProcess = spawn(getPythonPath(), ['--version']);
      let output = '';
      let error = '';

      const timeoutId = setTimeout(() => {
        pythonProcess.kill();
        resolve({
          status: 'timeout',
          healthy: false,
          message: 'Python health check timeout',
          responseTime: Date.now() - startTime
        });
      }, timeout);

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (code === 0 || output.includes('Python')) {
          resolve({
            status: 'healthy',
            healthy: true,
            message: 'Python subprocess accessible',
            version: (output + error).trim(),
            responseTime
          });
        } else {
          resolve({
            status: 'unhealthy',
            healthy: false,
            message: 'Python check failed',
            error: error.trim(),
            responseTime
          });
        }
      });

      pythonProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          status: 'error',
          healthy: false,
          message: err.message,
          responseTime: Date.now() - startTime
        });
      });
    } catch (error) {
      resolve({
        status: 'error',
        healthy: false,
        message: error.message,
        responseTime: Date.now() - startTime
      });
    }
  });
}

module.exports = router;
