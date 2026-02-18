/**
 * Footer Component Types
 * Shared TypeScript interfaces and types for footer components
 */

import type { ReactElement } from 'react';

/**
 * Theme type used across all footer components
 */
export type Theme = 'light' | 'dark';

/**
 * Base props for all footer components
 */
export interface BaseFooterProps {
  theme: Theme;
}

/**
 * Newsletter subscription form state
 */
export interface NewsletterFormState {
  email: string;
  honeypot: string;
  loading: boolean;
  message: {
    type: 'success' | 'error';
    text: string;
  } | null;
}

/**
 * Newsletter API request
 */
export interface NewsletterSubscribeRequest {
  email: string;
}

/**
 * Newsletter API response (success)
 */
export interface NewsletterSubscribeResponse {
  success: boolean;
  message: string;
}

/**
 * Newsletter API response (error)
 */
export interface NewsletterErrorResponse {
  error: string;
}

/**
 * Navigation link item
 */
export interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

/**
 * Social media link with icon
 */
export interface SocialLink {
  icon: ReactElement;
  label: string;
  href: string;
}

/**
 * Footer section structure
 */
export interface FooterSection {
  title: string;
  links: LinkItem[];
}

/**
 * Complete footer configuration
 */
export interface FooterConfig {
  newsletter: {
    title: string;
    description: string;
    trustSignal: string;
    apiEndpoint: string;
    gdprText: string;
  };
  navigation: {
    about: LinkItem[];
    resources: LinkItem[];
  };
  social: SocialLink[];
  legal: {
    copyright: string;
    links: LinkItem[];
  };
}

/**
 * Email validation result
 */
export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Form submission result
 */
export interface FormSubmissionResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Hover state for interactive elements
 */
export interface HoverState {
  isHovered: boolean;
}

/**
 * Accessibility props for interactive elements
 */
export interface AccessibilityProps {
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
  tabIndex?: number;
}

/**
 * Tool category constants
 */
export const ToolCategory = {
  AI_DETECTION: 'ai-detection',
  WRITING_TOOLS: 'writing-tools',
  ANALYSIS_TOOLS: 'analysis-tools',
  COMPARISON_TOOLS: 'comparison-tools'
} as const;

export type ToolCategory = typeof ToolCategory[keyof typeof ToolCategory];

/**
 * Tool definition
 */
export interface Tool {
  id: string;
  name: string;
  icon: string;
  path: string;
  category: ToolCategory;
  description: string;
  features: string[];
  longDescription: string;
  isPopular?: boolean;
  isNew?: boolean;
}

/**
 * Tool category group
 */
export interface ToolCategoryGroup {
  category: ToolCategory;
  label: string;
  description: string;
  tools: Tool[];
}

/**
 * Footer stats data
 */
export interface FooterStats {
  analyses: number;
  accuracy: number;
  uptime: number;
}

/**
 * Testimonial data
 */
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
}
