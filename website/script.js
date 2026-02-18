/**
 * OriginLytics - Main JavaScript
 * Handles interactive elements and progressive enhancement
 */

(function() {
  'use strict';

  // Mobile menu toggle
  function initMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navList = document.querySelector('.nav-list');

    if (menuToggle && navList) {
      menuToggle.addEventListener('click', function() {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', !isExpanded);
        navList.classList.toggle('active');
      });

      // Close menu when clicking outside
      document.addEventListener('click', function(event) {
        const isClickInside = menuToggle.contains(event.target) || navList.contains(event.target);
        if (!isClickInside && navList.classList.contains('active')) {
          navList.classList.remove('active');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      });

      // Close menu when clicking on a nav link
      const navLinks = navList.querySelectorAll('a');
      navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
          navList.classList.remove('active');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  // Smooth scroll for anchor links
  function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');

        // Skip if it's just "#"
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);

        if (targetElement) {
          e.preventDefault();
          const headerHeight = document.querySelector('.site-header').offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL without jumping
          history.pushState(null, null, targetId);
        }
      });
    });
  }

  // FAQ accordion functionality
  function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item h3');

    faqItems.forEach(function(question) {
      question.addEventListener('click', function() {
        const answer = this.nextElementSibling;
        const isExpanded = answer.style.display === 'block';

        // Toggle answer visibility
        if (isExpanded) {
          answer.style.display = 'none';
          this.setAttribute('aria-expanded', 'false');
        } else {
          answer.style.display = 'block';
          this.setAttribute('aria-expanded', 'true');
        }

        // Add arrow indicator
        const arrow = this.querySelector('.arrow');
        if (!arrow) {
          const arrowSpan = document.createElement('span');
          arrowSpan.className = 'arrow';
          arrowSpan.textContent = isExpanded ? ' ▼' : ' ▲';
          arrowSpan.setAttribute('aria-hidden', 'true');
          this.appendChild(arrowSpan);
        } else {
          arrow.textContent = isExpanded ? ' ▼' : ' ▲';
        }
      });

      // Set initial state
      question.setAttribute('role', 'button');
      question.setAttribute('aria-expanded', 'true');
      question.setAttribute('tabindex', '0');

      // Keyboard support
      question.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });
  }

  // Demo form submission (placeholder)
  function initDemoForm() {
    const demoForm = document.querySelector('.demo-form');

    if (demoForm) {
      demoForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const content = document.getElementById('demo-content').value;
        const file = document.getElementById('demo-file').files[0];

        if (!content && !file) {
          alert('Please provide content to verify (text or file).');
          return;
        }

        // Placeholder for actual verification
        alert('Demo submission received! In production, this would send your content to the verification API.');

        // Reset form
        this.reset();
      });
    }
  }

  // Contact form submission (placeholder)
  function initContactForm() {
    const contactForm = document.querySelector('.contact-form');

    if (contactForm) {
      contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;

        if (!name || !email || !message) {
          alert('Please fill out all required fields.');
          return;
        }

        // Placeholder for actual form submission
        alert('Thank you for contacting us! We will respond within 24 hours.');

        // Reset form
        this.reset();
      });
    }
  }

  // Lazy loading for images (if needed in future)
  function initLazyLoading() {
    if ('loading' in HTMLImageElement.prototype) {
      const images = document.querySelectorAll('img[loading="lazy"]');
      images.forEach(img => {
        img.src = img.dataset.src;
      });
    } else {
      // Fallback for browsers that don't support lazy loading
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
      document.body.appendChild(script);
    }
  }

  // Highlight active navigation item based on scroll position
  function initScrollSpy() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.main-nav a[href^="#"]');

    function highlightNav() {
      let current = '';
      const scrollPosition = window.pageYOffset;

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (scrollPosition >= sectionTop - 100) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
          link.classList.add('active');
        }
      });
    }

    if (sections.length > 0) {
      window.addEventListener('scroll', highlightNav);
      highlightNav(); // Call once on load
    }
  }

  // Add back-to-top button functionality
  function initBackToTop() {
    const backToTopLink = document.querySelector('a[href="#main-content"]');

    if (backToTopLink && backToTopLink.textContent.includes('Back to top')) {
      window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
          backToTopLink.style.display = 'inline';
        } else {
          backToTopLink.style.display = 'none';
        }
      });
    }
  }

  // Performance optimization: Track Core Web Vitals
  function trackWebVitals() {
    // Only track in production
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return;
    }

    // Placeholder for web vitals tracking
    // In production, integrate with Google Analytics or similar
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            console.log('FID:', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
          console.log('CLS:', clsScore);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Observer not supported
        console.log('Performance Observer not supported');
      }
    }
  }

  // Initialize all functions when DOM is ready
  function init() {
    initMobileMenu();
    initSmoothScroll();
    initFAQAccordion();
    initDemoForm();
    initContactForm();
    initLazyLoading();
    initScrollSpy();
    initBackToTop();
    trackWebVitals();
  }

  // Check if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Register Service Worker for PWA (if available)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          console.log('ServiceWorker registration successful');
        })
        .catch(function(err) {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }

})();
