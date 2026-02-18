/**
 * OriginLytics - Google Analytics 4 Integration
 * Version: 1.0.0
 * Description: GA4 tracking with custom event tracking for conversions
 */

(function() {
  'use strict';

  // Configuration
  const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with actual GA4 Measurement ID
  const DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Initialize Google Analytics
  function initGoogleAnalytics() {
    if (DEBUG_MODE) {
      console.log('[Analytics] Debug mode - GA tracking disabled on localhost');
      return;
    }

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      'send_page_view': true,
      'anonymize_ip': true, // GDPR compliance
      'cookie_flags': 'SameSite=None;Secure'
    });

    console.log('[Analytics] Google Analytics initialized');
  }

  // Track custom events
  function trackEvent(eventName, eventParams = {}) {
    if (DEBUG_MODE) {
      console.log('[Analytics] Event tracked:', eventName, eventParams);
      return;
    }

    if (typeof gtag === 'function') {
      gtag('event', eventName, eventParams);
    }
  }

  // Track CTA button clicks
  function trackCTAClicks() {
    // Primary CTA - "Start Free Verification"
    const primaryCTAs = document.querySelectorAll('a[href="#demo"], .btn-primary');
    primaryCTAs.forEach(function(button) {
      button.addEventListener('click', function(e) {
        const buttonText = this.textContent.trim();
        trackEvent('cta_click', {
          'button_text': buttonText,
          'button_type': 'primary',
          'button_location': getButtonLocation(this),
          'event_category': 'engagement',
          'event_label': buttonText
        });
      });
    });

    // Secondary CTAs
    const secondaryCTAs = document.querySelectorAll('.btn-secondary');
    secondaryCTAs.forEach(function(button) {
      button.addEventListener('click', function(e) {
        const buttonText = this.textContent.trim();
        trackEvent('cta_click', {
          'button_text': buttonText,
          'button_type': 'secondary',
          'button_location': getButtonLocation(this),
          'event_category': 'engagement',
          'event_label': buttonText
        });
      });
    });
  }

  // Get button location (which section)
  function getButtonLocation(element) {
    const section = element.closest('section');
    if (section) {
      return section.id || section.className.split(' ')[0] || 'unknown';
    }
    return 'header';
  }

  // Track form submissions
  function trackFormSubmissions() {
    // Demo form
    const demoForm = document.querySelector('.demo-form');
    if (demoForm) {
      demoForm.addEventListener('submit', function(e) {
        trackEvent('form_submit', {
          'form_name': 'demo_form',
          'form_type': 'demo',
          'event_category': 'conversion',
          'event_label': 'Demo Form Submission'
        });

        // Track as conversion
        trackEvent('generate_lead', {
          'value': 1,
          'currency': 'USD'
        });
      });
    }

    // Contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function(e) {
        const interest = document.getElementById('contact-interest')?.value || 'unknown';

        trackEvent('form_submit', {
          'form_name': 'contact_form',
          'form_type': 'contact',
          'interest_type': interest,
          'event_category': 'conversion',
          'event_label': 'Contact Form Submission'
        });

        // Track as conversion
        trackEvent('generate_lead', {
          'value': 5,
          'currency': 'USD'
        });
      });
    }
  }

  // Track section scrolls (for engagement measurement)
  function trackSectionScrolls() {
    const sections = document.querySelectorAll('main section[id]');
    const scrolledSections = new Set();

    function checkSectionVisibility() {
      sections.forEach(function(section) {
        const sectionId = section.id;
        if (scrolledSections.has(sectionId)) return;

        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;

        // Check if section is at least 50% visible
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          scrolledSections.add(sectionId);

          trackEvent('scroll_to_section', {
            'section_id': sectionId,
            'section_name': section.querySelector('h2')?.textContent || sectionId,
            'event_category': 'engagement',
            'event_label': `Scrolled to: ${sectionId}`
          });
        }
      });
    }

    // Throttle scroll events
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(checkSectionVisibility, 150);
    });

    // Check on load
    checkSectionVisibility();
  }

  // Track FAQ expansions
  function trackFAQExpansions() {
    const faqQuestions = document.querySelectorAll('.faq-item h3');

    faqQuestions.forEach(function(question) {
      question.addEventListener('click', function() {
        const questionText = this.textContent.trim().replace(/[▼▲]/g, '').trim();
        const isExpanded = this.getAttribute('aria-expanded') === 'true';

        if (!isExpanded) { // Track when expanding (not collapsing)
          trackEvent('faq_expand', {
            'question': questionText,
            'event_category': 'engagement',
            'event_label': questionText
          });
        }
      });
    });
  }

  // Track pricing card interactions
  function trackPricingInteractions() {
    const pricingCards = document.querySelectorAll('.pricing-card');

    pricingCards.forEach(function(card) {
      const planName = card.querySelector('h3')?.textContent || 'unknown';
      const ctaButton = card.querySelector('.btn-primary, .btn-secondary');

      if (ctaButton) {
        ctaButton.addEventListener('click', function(e) {
          trackEvent('select_plan', {
            'plan_name': planName,
            'plan_type': card.classList.contains('featured') ? 'featured' : 'standard',
            'event_category': 'conversion',
            'event_label': `Selected Plan: ${planName}`
          });
        });
      }
    });
  }

  // Track external link clicks
  function trackExternalLinks() {
    const externalLinks = document.querySelectorAll('a[target="_blank"], a[rel*="noopener"]');

    externalLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        const url = this.href;
        const linkText = this.textContent.trim();

        trackEvent('click', {
          'link_url': url,
          'link_text': linkText,
          'link_domain': new URL(url).hostname,
          'event_category': 'outbound',
          'event_label': url
        });
      });
    });
  }

  // Track navigation clicks
  function trackNavigationClicks() {
    const navLinks = document.querySelectorAll('.main-nav a');

    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        const linkText = this.textContent.trim();
        const linkHref = this.getAttribute('href');

        trackEvent('navigation_click', {
          'link_text': linkText,
          'link_href': linkHref,
          'event_category': 'navigation',
          'event_label': linkText
        });
      });
    });
  }

  // Track page engagement time
  function trackEngagementTime() {
    let startTime = Date.now();
    let isActive = true;
    let totalEngagementTime = 0;

    // Track when user becomes inactive
    let inactiveTimeout;
    function resetInactiveTimer() {
      clearTimeout(inactiveTimeout);
      isActive = true;
      inactiveTimeout = setTimeout(function() {
        isActive = false;
      }, 30000); // 30 seconds of inactivity
    }

    // Listen for user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(function(event) {
      document.addEventListener(event, resetInactiveTimer);
    });

    resetInactiveTimer();

    // Send engagement time every 30 seconds if user is active
    setInterval(function() {
      if (isActive) {
        const currentTime = Date.now();
        const engagementSeconds = Math.round((currentTime - startTime) / 1000);
        totalEngagementTime = engagementSeconds;

        trackEvent('user_engagement', {
          'engagement_time_seconds': engagementSeconds,
          'event_category': 'engagement',
          'event_label': 'Time on page'
        });
      }
    }, 30000);

    // Send final engagement time on page unload
    window.addEventListener('beforeunload', function() {
      const currentTime = Date.now();
      const engagementSeconds = Math.round((currentTime - startTime) / 1000);

      trackEvent('page_exit', {
        'engagement_time_seconds': engagementSeconds,
        'event_category': 'engagement',
        'event_label': 'Exit time'
      });
    });
  }

  // Track viewport size (for responsive design insights)
  function trackViewport() {
    const width = window.innerWidth || document.documentElement.clientWidth;
    const height = window.innerHeight || document.documentElement.clientHeight;

    let deviceCategory = 'desktop';
    if (width < 768) deviceCategory = 'mobile';
    else if (width < 1024) deviceCategory = 'tablet';

    trackEvent('viewport_info', {
      'viewport_width': width,
      'viewport_height': height,
      'device_category': deviceCategory,
      'event_category': 'technical',
      'event_label': `${deviceCategory} - ${width}x${height}`
    });
  }

  // Initialize all tracking
  function init() {
    initGoogleAnalytics();

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        trackCTAClicks();
        trackFormSubmissions();
        trackSectionScrolls();
        trackFAQExpansions();
        trackPricingInteractions();
        trackExternalLinks();
        trackNavigationClicks();
        trackEngagementTime();
        trackViewport();
      });
    } else {
      trackCTAClicks();
      trackFormSubmissions();
      trackSectionScrolls();
      trackFAQExpansions();
      trackPricingInteractions();
      trackExternalLinks();
      trackNavigationClicks();
      trackEngagementTime();
      trackViewport();
    }
  }

  // Run initialization
  init();

  // Export tracking function for manual use
  window.trackCustomEvent = trackEvent;

})();
