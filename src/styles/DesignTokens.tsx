/**
 * OriginLytics — Design Tokens Component
 * Arcane Forge Transformation
 * 
 * This component adds dynamic/gradient styles that complement theme.css
 * Variables align with theme.css naming conventions
 */

export const DesignTokens = () => (
  <style>{`
    /* ============================================================================
       ANIMATED BACKGROUND GRADIENTS
       These add visual depth without conflicting with theme.css base colors
       ============================================================================ */
    
    body, .App {
      background:
        radial-gradient(1200px 600px at 10% -10%, 
          color-mix(in srgb, var(--seo-primary, #3B82F6) 8%, transparent), 
          transparent),
        radial-gradient(900px 500px at 120% 10%, 
          color-mix(in srgb, var(--geo-primary, #8B5CF6) 6%, transparent), 
          transparent),
        var(--bg-primary, #ffffff);
    }
    
    [data-theme="dark"] body,
    [data-theme="dark"] .App {
      background:
        radial-gradient(1200px 600px at 10% -10%, 
          color-mix(in srgb, var(--seo-primary, #60A5FA) 10%, transparent), 
          transparent),
        radial-gradient(900px 500px at 120% 10%, 
          color-mix(in srgb, var(--geo-primary, #A78BFA) 8%, transparent), 
          transparent),
        var(--bg-primary, #0F172A);
    }

    /* ============================================================================
       ENHANCED CARD VARIANTS
       Gradient cards for featured sections
       ============================================================================ */
    
    .card-gradient {
      background:
        linear-gradient(180deg,
          color-mix(in srgb, var(--card, #ffffff) 100%, transparent),
          color-mix(in srgb, var(--bg-secondary, #f9fafb) 100%, transparent)),
        radial-gradient(600px 260px at 10% -20%,
          color-mix(in srgb, var(--seo-primary, #3B82F6) 12%, transparent),
          transparent 60%),
        radial-gradient(400px 200px at 100% 0%,
          color-mix(in srgb, var(--geo-primary, #8B5CF6) 8%, transparent),
          transparent 60%);
      border: var(--hairline, 1px solid rgba(0,0,0,0.08));
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-2, 0 4px 6px rgba(0,0,0,0.1));
    }
    
    [data-theme="dark"] .card-gradient {
      background:
        linear-gradient(180deg,
          color-mix(in srgb, var(--card, #1E293B) 100%, transparent),
          color-mix(in srgb, var(--bg-secondary, #0F172A) 100%, transparent)),
        radial-gradient(600px 260px at 10% -20%,
          color-mix(in srgb, var(--seo-primary, #60A5FA) 15%, transparent),
          transparent 60%),
        radial-gradient(400px 200px at 100% 0%,
          color-mix(in srgb, var(--geo-primary, #A78BFA) 10%, transparent),
          transparent 60%);
    }

    /* ============================================================================
       BUTTON VARIANTS
       ============================================================================ */
    
    .btn-gradient {
      background: linear-gradient(135deg, 
        var(--seo-primary, #3B82F6), 
        var(--geo-primary, #8B5CF6));
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: var(--radius-lg, 12px);
      font-weight: 600;
      font-family: var(--font-display, 'Outfit', sans-serif);
      letter-spacing: 0.02em;
      box-shadow: 
        0 4px 14px color-mix(in srgb, var(--seo-primary, #3B82F6) 35%, transparent),
        inset 0 1px 0 rgba(255,255,255,0.2);
      transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
                  box-shadow 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    
    .btn-gradient:hover {
      transform: translateY(-2px);
      box-shadow: 
        0 6px 20px color-mix(in srgb, var(--seo-primary, #3B82F6) 40%, transparent),
        inset 0 1px 0 rgba(255,255,255,0.2);
    }
    
    .btn-gradient:active {
      transform: translateY(0);
    }

    /* ============================================================================
       INPUT FIELD ENHANCEMENTS
       ============================================================================ */
    
    .field-enhanced {
      background: var(--bg-secondary, #f9fafb);
      color: var(--text-primary, #111827);
      border: 1px solid var(--border-primary, #e5e7eb);
      border-radius: var(--radius-lg, 12px);
      padding: 12px 16px;
      font-size: 1rem;
      outline: none;
      transition: 
        box-shadow 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
        border-color 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    
    .field-enhanced:focus {
      border-color: var(--seo-primary, #3B82F6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--seo-primary, #3B82F6) 20%, transparent);
    }
    
    [data-theme="dark"] .field-enhanced {
      background: var(--bg-secondary, #1E293B);
      border-color: var(--border-primary, #334155);
    }

    /* ============================================================================
       GRID LAYOUTS
       ============================================================================ */
    
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4, 16px);
    }
    
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-4, 16px);
    }
    
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4, 16px);
    }
    
    @media (max-width: 1024px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 640px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    }

    /* ============================================================================
       CONTAINER
       ============================================================================ */
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 var(--space-4, 16px);
    }
    
    .container-sm { max-width: 640px; }
    .container-md { max-width: 768px; }
    .container-lg { max-width: 1024px; }
    .container-xl { max-width: 1280px; }

    /* ============================================================================
       SECTION SPACING
       ============================================================================ */
    
    .section {
      padding: var(--space-16, 64px) 0;
    }
    
    .section-sm {
      padding: var(--space-8, 32px) 0;
    }
    
    .section-lg {
      padding: var(--space-24, 96px) 0;
    }

    /* ============================================================================
       LOADING STATES
       ============================================================================ */
    
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--bg-tertiary, #f3f4f6) 0%,
        var(--bg-secondary, #f9fafb) 50%,
        var(--bg-tertiary, #f3f4f6) 100%
      );
      background-size: 200% 100%;
      animation: skeleton-pulse 1.5s ease-in-out infinite;
      border-radius: var(--radius-md, 8px);
    }
    
    @keyframes skeleton-pulse {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ============================================================================
       BADGE/CHIP VARIANTS
       ============================================================================ */
    
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      font-size: var(--text-xs, 0.75rem);
      font-weight: 500;
      border-radius: var(--radius-full, 9999px);
      background: var(--bg-tertiary, #f3f4f6);
      color: var(--text-secondary, #4b5563);
    }
    
    .badge-seo {
      background: var(--seo-bg, #eff6ff);
      color: var(--seo-primary, #3B82F6);
    }
    
    .badge-geo {
      background: var(--geo-bg, #faf5ff);
      color: var(--geo-primary, #8B5CF6);
    }
    
    .badge-success {
      background: var(--success-bg, #d1fae5);
      color: var(--success, #10b981);
    }
    
    .badge-warning {
      background: var(--warning-bg, #fef3c7);
      color: var(--warning, #f59e0b);
    }
    
    .badge-error {
      background: var(--error-bg, #fee2e2);
      color: var(--error, #ef4444);
    }
  `}</style>
);
