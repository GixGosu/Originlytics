/**
 * Input Validation Schemas using Joi
 *
 * CRITICAL SECURITY FIX #4: Add input validation to prevent injection attacks
 *
 * All user input must be validated before use in:
 * - Database queries (SQL injection prevention)
 * - External API calls (SSRF prevention)
 * - File system operations (path traversal prevention)
 * - Python subprocess calls (command injection prevention)
 */

const Joi = require('joi');

// ============================================================================
// URL Validation (for /api/analyze endpoint)
// ============================================================================
const urlSchema = Joi.object({
  url: Joi.string()
    .uri({
      scheme: ['http', 'https'], // Only allow HTTP/HTTPS
    })
    .max(2048) // Prevent extremely long URLs
    .messages({
      'string.uri': 'Invalid URL format. Must be a valid HTTP or HTTPS URL.',
      'string.max': 'URL is too long. Maximum 2048 characters.',
    }),
  text: Joi.string()
    .min(10)
    .max(100000) // Prevent extremely large inputs (DoS)
    .messages({
      'string.min': 'Text must be at least 10 characters.',
      'string.max': 'Text is too long. Maximum 100,000 characters.',
    }),
  useAdvanced: Joi.boolean().optional(),
})
  .xor('url', 'text') // Exactly one of url or text must be provided
  .messages({
    'object.xor': 'Either URL or text is required (but not both).',
    'object.missing': 'Either URL or text is required.',
  });

// ============================================================================
// Authentication Validation
// ============================================================================
const signupSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Invalid email format.',
      'any.required': 'Email is required.',
    }),
  password: Joi.string()
    .min(12)
    .max(128)
    .pattern(/[a-z]/) // At least one lowercase
    .pattern(/[A-Z]/) // At least one uppercase
    .pattern(/[0-9]/) // At least one number
    .pattern(/[^a-zA-Z0-9]/) // At least one special character
    .required()
    .messages({
      'string.min': 'Password must be at least 12 characters long.',
      'string.max': 'Password is too long. Maximum 128 characters.',
      'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character.',
      'any.required': 'Password is required.',
    }),
  recaptchaToken: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.base': 'Invalid reCAPTCHA token.',
    }),
  referralCode: Joi.string()
    .optional()
    .alphanum()
    .uppercase()
    .length(6)
    .messages({
      'string.alphanum': 'Referral code must contain only letters and numbers.',
      'string.length': 'Referral code must be exactly 6 characters.',
    }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Invalid email format.',
      'any.required': 'Email is required.',
    }),
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'any.required': 'Password is required.',
    }),
});

// ============================================================================
// API Key Validation
// ============================================================================
const apiKeyCreateSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/) // Alphanumeric, spaces, hyphens, underscores only
    .required()
    .messages({
      'string.pattern.base': 'API key name can only contain letters, numbers, spaces, hyphens, and underscores.',
      'any.required': 'API key name is required.',
    }),
  scopes: Joi.array()
    .items(Joi.string().valid('analyze', 'read', 'write'))
    .min(1)
    .max(10)
    .optional()
    .default(['analyze'])
    .messages({
      'array.min': 'At least one scope is required.',
      'any.only': 'Invalid scope. Allowed values: analyze, read, write.',
    }),
});

// ============================================================================
// UUID Validation (for user IDs, analysis IDs, etc.)
// ============================================================================
const uuidSchema = Joi.string()
  .uuid()
  .required()
  .messages({
    'string.uuid': 'Invalid ID format. Must be a valid UUID.',
    'any.required': 'ID is required.',
  });

// ============================================================================
// Pagination Validation
// ============================================================================
const paginationSchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1.',
      'number.max': 'Limit cannot exceed 100.',
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional()
    .messages({
      'number.min': 'Offset cannot be negative.',
    }),
});

// ============================================================================
// Stripe Payment Validation
// ============================================================================
const stripeCheckoutSchema = Joi.object({
  packageId: Joi.string()
    .pattern(/^tok_\d+_\d+$/) // Format: tok_100_1 (tok_<tokens>_<price>)
    .required()
    .messages({
      'string.pattern.base': 'Invalid package ID format.',
      'any.required': 'Package ID is required.',
    }),
});

// ============================================================================
// Text Analysis Validation (for Python scripts)
// ============================================================================
const textAnalysisSchema = Joi.object({
  text: Joi.string()
    .min(10)
    .max(100000) // Prevent extremely large inputs (DoS)
    .required()
    .messages({
      'string.min': 'Text must be at least 10 characters.',
      'string.max': 'Text is too long. Maximum 100,000 characters.',
      'any.required': 'Text is required.',
    }),
});

// ============================================================================
// Validation Middleware Factory
// ============================================================================

/**
 * Create a validation middleware for a given schema
 *
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} source - Where to get data from ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown keys
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace request data with validated (and sanitized) data
    req[source] = value;
    next();
  };
}

/**
 * Validate a UUID parameter (e.g., /api/analyses/:id)
 */
function validateUuidParam(paramName = 'id') {
  return (req, res, next) => {
    const { error, value } = uuidSchema.validate(req.params[paramName]);

    if (error) {
      return res.status(400).json({
        error: 'Invalid ID format',
        message: error.details[0].message,
      });
    }

    req.params[paramName] = value;
    next();
  };
}

// ============================================================================
// Export validation schemas and middleware
// ============================================================================
module.exports = {
  // Schemas
  urlSchema,
  signupSchema,
  loginSchema,
  apiKeyCreateSchema,
  uuidSchema,
  paginationSchema,
  stripeCheckoutSchema,
  textAnalysisSchema,

  // Middleware
  validate,
  validateUuidParam,
};
