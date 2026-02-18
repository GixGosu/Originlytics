/**
 * OriginLytics - Uptime & Status Monitoring Configuration
 * Version: 1.0.0
 * Description: Configuration for uptime monitoring services (UptimeRobot, Better Uptime, etc.)
 */

/**
 * UPTIME MONITORING CONFIGURATION
 * ================================
 *
 * This file contains configuration examples for popular uptime monitoring services.
 * Choose one or more services and configure them according to your needs.
 *
 * Recommended Services:
 * 1. UptimeRobot (https://uptimerobot.com) - Free tier: 50 monitors
 * 2. Better Uptime (https://betteruptime.com) - Free tier: 10 monitors
 * 3. Pingdom (https://pingdom.com) - Paid service with advanced features
 * 4. StatusCake (https://statuscake.com) - Free tier: unlimited monitors
 */

// ===================================================================
// 1. UPTIMEROBOT CONFIGURATION
// ===================================================================

const UPTIMEROBOT_CONFIG = {
  // API Key (get from UptimeRobot dashboard)
  apiKey: 'ur1234567-abcdef1234567890abcdef12', // Replace with actual API key

  // Monitors to create
  monitors: [
    {
      friendly_name: 'OriginLytics - Homepage',
      url: 'https://originlytics.com',
      type: 1, // HTTP(s)
      interval: 300, // Check every 5 minutes
      timeout: 30,
      alert_contacts: ['contact_id_1', 'contact_id_2'] // Add contact IDs
    },
    {
      friendly_name: 'OriginLytics - API Health',
      url: 'https://api.originlytics.com/health',
      type: 1,
      interval: 300,
      timeout: 30
    }
  ],

  // Alert contacts
  alert_contacts: [
    {
      type: 2, // Email
      value: 'alerts@originlytics.com',
      friendly_name: 'Alerts Email'
    },
    {
      type: 6, // Slack
      value: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      friendly_name: 'Slack Alerts'
    }
  ],

  // Status page
  status_page: {
    friendly_name: 'OriginLytics Status',
    custom_domain: 'status.originlytics.com',
    monitors: ['monitor_id_1', 'monitor_id_2']
  }
};

// ===================================================================
// 2. BETTER UPTIME CONFIGURATION
// ===================================================================

const BETTER_UPTIME_CONFIG = {
  // API Token (get from Better Uptime dashboard)
  apiToken: 'Bearer your_better_uptime_api_token_here',

  // Monitors to create
  monitors: [
    {
      monitor_type: 'status',
      url: 'https://originlytics.com',
      check_frequency: 180, // 3 minutes
      request_timeout: 30,
      confirmation_period: 60,
      call: true, // Enable phone call alerts
      sms: true,
      email: true,
      push: true
    },
    {
      monitor_type: 'status',
      url: 'https://originlytics.com/api/health',
      check_frequency: 180,
      expected_status_codes: [200],
      request_timeout: 30
    }
  ],

  // Status page
  status_page: {
    company_name: 'OriginLytics',
    company_url: 'https://originlytics.com',
    subdomain: 'status',
    custom_domain: 'status.originlytics.com',
    timezone: 'America/New_York'
  }
};

// ===================================================================
// 3. STATUSCAKE CONFIGURATION
// ===================================================================

const STATUSCAKE_CONFIG = {
  // API Key
  apiKey: 'your_statuscake_api_key_here',

  // Tests (monitors) to create
  tests: [
    {
      WebsiteName: 'OriginLytics Homepage',
      WebsiteURL: 'https://originlytics.com',
      TestType: 'HTTP',
      CheckRate: 300, // 5 minutes
      TestTags: ['production', 'website'],
      ContactGroup: 'default',
      Timeout: 30,
      EnableSSLAlert: true,
      FollowRedirect: true
    },
    {
      WebsiteName: 'OriginLytics SSL Certificate',
      WebsiteURL: 'https://originlytics.com',
      TestType: 'SSL',
      CheckRate: 86400, // Daily
      AlertExpiry: 30, // Alert 30 days before expiry
      AlertReminder: 7 // Remind every 7 days
    }
  ]
};

// ===================================================================
// 4. CUSTOM HEALTH CHECK ENDPOINT
// ===================================================================

/**
 * Health check endpoint specification
 *
 * Create this endpoint if you have server-side capabilities
 * Path: /api/health or /health
 *
 * Response format:
 * {
 *   "status": "ok",
 *   "timestamp": "2025-01-15T10:30:00Z",
 *   "version": "1.0.0",
 *   "checks": {
 *     "database": "ok",
 *     "api": "ok",
 *     "cache": "ok"
 *   },
 *   "uptime": 99.99
 * }
 */

// Client-side health check (basic)
function performClientHealthCheck() {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      dom: document.readyState === 'complete',
      scripts: document.scripts.length > 0,
      styles: document.styleSheets.length > 0
    },
    performance: {
      load_time: performance.timing.loadEventEnd - performance.timing.navigationStart,
      dom_ready: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
    }
  };

  return healthData;
}

// ===================================================================
// 5. SYNTHETIC MONITORING CONFIGURATION
// ===================================================================

const SYNTHETIC_MONITORING = {
  // Define critical user journeys to monitor
  journeys: [
    {
      name: 'Homepage Load',
      steps: [
        { action: 'navigate', url: 'https://originlytics.com' },
        { action: 'wait', selector: 'h1', timeout: 5000 },
        { action: 'assert', selector: '.hero-section', exists: true }
      ],
      frequency: '5m',
      locations: ['us-east', 'us-west', 'eu-west', 'ap-southeast']
    },
    {
      name: 'Demo Form Submission',
      steps: [
        { action: 'navigate', url: 'https://originlytics.com#demo' },
        { action: 'type', selector: '#demo-content', text: 'Test content' },
        { action: 'click', selector: '.demo-form button[type="submit"]' },
        { action: 'wait', timeout: 3000 }
      ],
      frequency: '15m',
      locations: ['us-east', 'eu-west']
    }
  ],

  // Performance budgets
  budgets: {
    'First Contentful Paint': 1800, // ms
    'Largest Contentful Paint': 2500, // ms
    'Time to Interactive': 3800, // ms
    'Total Blocking Time': 300, // ms
    'Cumulative Layout Shift': 0.1
  }
};

// ===================================================================
// 6. INCIDENT RESPONSE CONFIGURATION
// ===================================================================

const INCIDENT_RESPONSE = {
  // Escalation policy
  escalation: [
    {
      level: 1,
      delay: 0, // Immediate
      contacts: ['on-call-engineer@originlytics.com'],
      methods: ['email', 'sms', 'push']
    },
    {
      level: 2,
      delay: 300, // 5 minutes
      contacts: ['team-lead@originlytics.com'],
      methods: ['email', 'sms', 'phone']
    },
    {
      level: 3,
      delay: 900, // 15 minutes
      contacts: ['cto@originlytics.com'],
      methods: ['phone']
    }
  ],

  // Auto-remediation actions
  auto_remediation: {
    server_restart: false, // Don't auto-restart (static site)
    cache_clear: false,
    failover: true // Enable CDN failover if available
  },

  // Status page updates
  status_page_config: {
    auto_update: true,
    template_incident: 'We are currently investigating an issue with {service}. Updates will be posted here.',
    template_resolved: 'The issue with {service} has been resolved. All systems are operational.'
  }
};

// ===================================================================
// 7. MONITORING DASHBOARD LINKS
// ===================================================================

const MONITORING_DASHBOARDS = {
  // Add links to your monitoring dashboards
  uptimerobot: 'https://uptimerobot.com/dashboard',
  better_uptime: 'https://betteruptime.com/team/dashboard',
  google_analytics: 'https://analytics.google.com/analytics/web/',
  search_console: 'https://search.google.com/search-console',
  cloudflare: 'https://dash.cloudflare.com/',
  sentry: 'https://sentry.io/organizations/originlytics/',
  lighthouse: 'https://pagespeed.web.dev/report?url=https://originlytics.com'
};

// ===================================================================
// 8. EXPORT CONFIGURATION
// ===================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UPTIMEROBOT_CONFIG,
    BETTER_UPTIME_CONFIG,
    STATUSCAKE_CONFIG,
    SYNTHETIC_MONITORING,
    INCIDENT_RESPONSE,
    MONITORING_DASHBOARDS,
    performClientHealthCheck
  };
}

// ===================================================================
// SETUP INSTRUCTIONS
// ===================================================================

/**
 * HOW TO SET UP UPTIME MONITORING:
 *
 * 1. CHOOSE A SERVICE:
 *    - UptimeRobot: Best for basic HTTP monitoring (free)
 *    - Better Uptime: Best for professional monitoring with status pages
 *    - StatusCake: Best for advanced features
 *
 * 2. CREATE ACCOUNT:
 *    - Sign up for your chosen service
 *    - Get API key from dashboard
 *
 * 3. CONFIGURE MONITORS:
 *    - Use the configuration examples above
 *    - Create monitors via API or dashboard
 *
 * 4. SET UP ALERTS:
 *    - Add email/SMS/Slack contacts
 *    - Configure alert thresholds
 *    - Test alert delivery
 *
 * 5. CREATE STATUS PAGE:
 *    - Set up public status page
 *    - Configure custom domain (status.originlytics.com)
 *    - Add to website footer
 *
 * 6. TEST MONITORING:
 *    - Trigger a test alert
 *    - Verify all contacts receive notifications
 *    - Check status page updates
 *
 * 7. INTEGRATE WITH SLACK:
 *    - Create Slack webhook
 *    - Add to monitoring service
 *    - Test notifications
 *
 * 8. SCHEDULE REGULAR REVIEWS:
 *    - Weekly: Check uptime metrics
 *    - Monthly: Review incidents and response times
 *    - Quarterly: Update monitoring configuration
 */
