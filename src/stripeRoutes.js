/**
 * Stripe Payment Routes
 * 
 * Handles token package purchases via Stripe Checkout.
 * 
 * Endpoints:
 * - POST /api/stripe/create-checkout - Create Stripe checkout session
 * - GET /api/stripe/packages - List available token packages
 * - POST /api/stripe/portal - Create customer portal session
 * 
 * Package SKUs (from PRICING_MODEL.md):
 * - tok_10_499: 10 credits for $4.99 (99.8% margin)
 * - tok_25_999: 25 credits for $9.99 (99.7% margin)
 * - tok_100_2999: 100 credits for $29.99 (99.6% margin)
 * - tok_500_9999: 500 credits for $99.99 (99.5% margin)
 */

const express = require('express');
const Stripe = require('stripe');
const { validate, stripeCheckoutSchema } = require('./validators');
const { getUserFromToken } = require('./supabaseClient');

const router = express.Router();

// Initialize Stripe (lazy loading)
let stripe = null;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
    });
    console.log('[Stripe] Initialized with API version 2024-11-20.acacia');
  }
  return stripe;
}

/**
 * Token packages configuration
 * Maps package IDs to credits and prices
 */
const PACKAGES = {
  tok_10_499: {
    id: 'tok_10_499',
    credits: 10,
    price: 499, // in cents
    priceFormatted: '$4.99',
    name: '10 Credit Package',
    description: '10 credits for deep AI content analysis',
    popular: false,
  },
  tok_25_999: {
    id: 'tok_25_999',
    credits: 25,
    price: 999,
    priceFormatted: '$9.99',
    name: '25 Credit Package',
    description: '25 credits - Best for regular users',
    popular: true, // Most popular
  },
  tok_100_2999: {
    id: 'tok_100_2999',
    credits: 100,
    price: 2999,
    priceFormatted: '$29.99',
    name: '100 Credit Package',
    description: '100 credits - Best value (40% off)',
    popular: false,
  },
  tok_500_9999: {
    id: 'tok_500_9999',
    credits: 500,
    price: 9999,
    priceFormatted: '$99.99',
    name: '500 Credit Package',
    description: '500 credits - Enterprise tier (60% off)',
    popular: false,
  },
};

/**
 * Middleware: Require authentication
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const { user, error } = await getUserFromToken(authHeader);
    
    if (error || !user) {
      console.error('[Auth] Error:', error || 'No user found');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * GET /api/stripe/packages
 * List all available token packages
 * 
 * Response: Array of package objects with credits, price, description
 */
router.get('/packages', (req, res) => {
  const packages = Object.values(PACKAGES);
  res.json({ packages });
});

/**
 * POST /api/stripe/create-checkout
 * Create a Stripe Checkout session for token purchase
 * 
 * Body:
 * - packageId: string (e.g., 'tok_25_999')
 * - successUrl: string (frontend URL to redirect after success)
 * - cancelUrl: string (frontend URL to redirect on cancel)
 * 
 * Response:
 * - sessionId: Stripe Checkout session ID
 * - url: Stripe Checkout URL to redirect user
 */
router.post('/create-checkout', requireAuth, validate(stripeCheckoutSchema), async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe not configured',
        message: 'Please set STRIPE_SECRET_KEY environment variable'
      });
    }

    // Input is validated by middleware
    const { packageId } = req.body;

    // Get successUrl and cancelUrl (should also be validated but for now we'll use defaults)
    const successUrl = req.body.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:5174'}/success`;
    const cancelUrl = req.body.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5174'}/cancel`;

    // Validate package ID
    const package = PACKAGES[packageId];
    if (!package) {
      return res.status(400).json({
        error: 'Invalid package ID',
        validPackages: Object.keys(PACKAGES)
      });
    }

    console.log(`[Stripe] Creating checkout session for user ${req.user.id}, package ${packageId}`);

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: package.name,
              description: package.description,
              metadata: {
                package_id: package.id,
                credits: package.credits.toString(),
              },
            },
            unit_amount: package.price, // in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: req.user.id,
        user_email: req.user.email,
        package_id: package.id,
        credits: package.credits.toString(),
      },
      customer_email: req.user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Allow promo codes if configured in Stripe dashboard
      allow_promotion_codes: true,
    });

    console.log(`[Stripe] Checkout session created: ${session.id}`);

    res.json({
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('[Stripe] Checkout error:', error.message);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
});

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session
 * Allows users to manage their payment methods and view invoices
 * 
 * Body:
 * - returnUrl: string (frontend URL to return to)
 * 
 * Response:
 * - url: Stripe Customer Portal URL
 */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Stripe not configured',
        message: 'Please set STRIPE_SECRET_KEY environment variable'
      });
    }

    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({ error: 'returnUrl is required' });
    }

    // In production, you'd look up the customer ID from your database
    // For now, we'll create a portal session without a customer (limited functionality)
    console.log(`[Stripe] Creating portal session for user ${req.user.id}`);

    // Note: This requires the customer to have made at least one purchase
    // You'll need to store stripe_customer_id in the users table after first purchase
    res.status(501).json({ 
      error: 'Customer portal requires prior purchase',
      message: 'This feature will be available after your first purchase'
    });

  } catch (error) {
    console.error('[Stripe] Portal error:', error.message);
    res.status(500).json({ 
      error: 'Failed to create portal session',
      message: error.message 
    });
  }
});

/**
 * GET /api/stripe/config
 * Get Stripe publishable key for frontend
 * 
 * Response:
 * - publishableKey: Stripe publishable key (safe to expose)
 */
router.get('/config', (req, res) => {
  // The publishable key is safe to expose to frontend
  // It should be in env vars as STRIPE_PUBLISHABLE_KEY
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  
  res.json({
    publishableKey,
    configured: !!process.env.STRIPE_SECRET_KEY,
  });
});

module.exports = router;
