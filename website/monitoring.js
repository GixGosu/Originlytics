/**
 * OriginLytics - Error Tracking & Performance Monitoring
 * Version: 1.0.0
 * Description: Sentry integration for error tracking and performance monitoring
 */

(function() {
  'use strict';

  // Configuration
  const SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0'; // Replace with actual Sentry DSN
  const ENVIRONMENT = window.location.hostname === 'localhost' ? 'development' : 'production';
  const RELEASE = '1.0.0'; // Update with actual release version
  const DEBUG_MODE = ENVIRONMENT === 'development';

  // Initialize Sentry
  function initSentry() {
    if (DEBUG_MODE) {
      console.log('[Monitoring] Debug mode - Sentry disabled on localhost');
      return;
    }

    // Load Sentry SDK
    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/7.91.0/bundle.tracing.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = function() {
      if (typeof Sentry !== 'undefined') {
        Sentry.init({
          dsn: SENTRY_DSN,
          environment: ENVIRONMENT,
          release: RELEASE,

          // Performance Monitoring
          integrations: [
            new Sentry.BrowserTracing({
              // Trace page navigation
              tracePropagationTargets: ['localhost', 'originlytics.com', /^\//],
            }),
            new Sentry.Replay({
              // Session replay for debugging
              maskAllText: true,
              blockAllMedia: true,
            })
          ],

          // Performance sampling
          tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

          // Session replay sampling
          replaysSessionSampleRate: 0.1, // 10% of sessions
          replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

          // Error filtering
          beforeSend(event, hint) {
            // Don't send errors from browser extensions
            if (event.exception) {
              const values = event.exception.values || [];
              for (const value of values) {
                if (value.stacktrace && value.stacktrace.frames) {
                  const frames = value.stacktrace.frames;
                  if (frames.some(frame => /chrome-extension|moz-extension/.test(frame.filename || ''))) {
                    return null;
                  }
                }
              }
            }

            // Filter out common non-issues
            const ignoredMessages = [
              'ResizeObserver loop limit exceeded',
              'Non-Error promise rejection captured',
              'top.GLOBALS'
            ];

            if (event.message && ignoredMessages.some(msg => event.message.includes(msg))) {
              return null;
            }

            return event;
          },

          // Add custom context
          initialScope: {
            tags: {
              'page': window.location.pathname,
              'referrer': document.referrer
            },
            user: {
              // Don't collect PII by default
              id: generateSessionId()
            }
          }
        });

        console.log('[Monitoring] Sentry initialized');
      }
    };

    document.head.appendChild(script);
  }

  // Generate anonymous session ID
  function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Manual error tracking
  function trackError(error, context = {}) {
    if (DEBUG_MODE) {
      console.error('[Monitoring] Error tracked:', error, context);
      return;
    }

    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(error, {
        contexts: {
          custom: context
        }
      });
    }
  }

  // Track custom messages
  function trackMessage(message, level = 'info', context = {}) {
    if (DEBUG_MODE) {
      console.log(`[Monitoring] Message tracked [${level}]:`, message, context);
      return;
    }

    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.captureMessage(message, {
        level: level,
        contexts: {
          custom: context
        }
      });
    }
  }

  // Track form errors
  function trackFormErrors() {
    const forms = document.querySelectorAll('form');

    forms.forEach(function(form) {
      form.addEventListener('invalid', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
          trackMessage('Form validation error', 'warning', {
            form_name: form.className,
            field_name: target.name || target.id,
            field_type: target.type,
            validation_message: target.validationMessage
          });
        }
      }, true);

      form.addEventListener('submit', function(e) {
        if (!form.checkValidity()) {
          trackMessage('Form submission blocked - validation failed', 'warning', {
            form_name: form.className
          });
        }
      });
    });
  }

  // Track AJAX errors
  function trackAjaxErrors() {
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args)
        .then(function(response) {
          if (!response.ok) {
            trackMessage('Fetch error', 'error', {
              url: args[0],
              status: response.status,
              statusText: response.statusText
            });
          }
          return response;
        })
        .catch(function(error) {
          trackError(error, {
            type: 'fetch_error',
            url: args[0]
          });
          throw error;
        });
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
      this._requestInfo = { method: method, url: url };
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
      const xhr = this;
      const originalOnLoad = xhr.onload;
      const originalOnError = xhr.onerror;

      xhr.onload = function() {
        if (xhr.status >= 400) {
          trackMessage('XHR error', 'error', {
            method: xhr._requestInfo.method,
            url: xhr._requestInfo.url,
            status: xhr.status,
            statusText: xhr.statusText
          });
        }
        if (originalOnLoad) originalOnLoad.apply(this, arguments);
      };

      xhr.onerror = function() {
        trackError(new Error('XHR request failed'), {
          type: 'xhr_error',
          method: xhr._requestInfo.method,
          url: xhr._requestInfo.url
        });
        if (originalOnError) originalOnError.apply(this, arguments);
      };

      return originalSend.apply(this, arguments);
    };
  }

  // Track resource loading errors
  function trackResourceErrors() {
    window.addEventListener('error', function(e) {
      if (e.target !== window) {
        // Resource loading error (image, script, etc.)
        const element = e.target;
        trackMessage('Resource load error', 'error', {
          resource_type: element.tagName,
          resource_src: element.src || element.href,
          resource_id: element.id,
          resource_class: element.className
        });
      }
    }, true);
  }

  // Track unhandled promise rejections
  function trackUnhandledRejections() {
    window.addEventListener('unhandledrejection', function(e) {
      trackError(new Error(e.reason || 'Unhandled promise rejection'), {
        type: 'unhandled_rejection',
        promise: e.promise
      });
    });
  }

  // Track performance metrics
  function trackPerformanceMetrics() {
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver(function(list) {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          const lcpValue = lastEntry.renderTime || lastEntry.loadTime;

          trackMessage('Core Web Vital - LCP', 'info', {
            metric: 'LCP',
            value: lcpValue,
            rating: lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor'
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver(function(list) {
          const entries = list.getEntries();
          entries.forEach(function(entry) {
            const fidValue = entry.processingStart - entry.startTime;

            trackMessage('Core Web Vital - FID', 'info', {
              metric: 'FID',
              value: fidValue,
              rating: fidValue < 100 ? 'good' : fidValue < 300 ? 'needs-improvement' : 'poor'
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver(function(list) {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Report CLS on page unload
        window.addEventListener('beforeunload', function() {
          trackMessage('Core Web Vital - CLS', 'info', {
            metric: 'CLS',
            value: clsScore,
            rating: clsScore < 0.1 ? 'good' : clsScore < 0.25 ? 'needs-improvement' : 'poor'
          });
        });

      } catch (e) {
        console.warn('[Monitoring] Performance Observer not fully supported:', e);
      }
    }

    // Navigation Timing
    window.addEventListener('load', function() {
      setTimeout(function() {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          trackMessage('Page Performance', 'info', {
            dns_time: perfData.domainLookupEnd - perfData.domainLookupStart,
            tcp_time: perfData.connectEnd - perfData.connectStart,
            request_time: perfData.responseStart - perfData.requestStart,
            response_time: perfData.responseEnd - perfData.responseStart,
            dom_processing_time: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            load_time: perfData.loadEventEnd - perfData.loadEventStart,
            total_time: perfData.loadEventEnd - perfData.fetchStart
          });
        }
      }, 0);
    });
  }

  // Track console errors (in production)
  function trackConsoleErrors() {
    const originalError = console.error;
    console.error = function() {
      if (!DEBUG_MODE) {
        const errorMessage = Array.from(arguments).join(' ');
        trackMessage('Console Error', 'error', {
          message: errorMessage
        });
      }
      return originalError.apply(console, arguments);
    };
  }

  // Initialize all monitoring
  function init() {
    initSentry();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        trackFormErrors();
        trackResourceErrors();
        trackUnhandledRejections();
        trackPerformanceMetrics();
      });
    } else {
      trackFormErrors();
      trackResourceErrors();
      trackUnhandledRejections();
      trackPerformanceMetrics();
    }

    trackAjaxErrors();
    trackConsoleErrors();
  }

  // Run initialization
  init();

  // Export tracking functions for manual use
  window.monitoringTrackError = trackError;
  window.monitoringTrackMessage = trackMessage;

})();
