import { useEffect } from 'react';
import { AIDetector } from './AIDetector';

// AIChecker is an alias for AIDetector with different SEO metadata
export function AIChecker() {
  useEffect(() => {
    // Override SEO meta tags for this page
    document.title = 'AI Checker - Verify Content Authenticity | OriginLytics';

    const setMetaTag = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    const setPropertyTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMetaTag('description', 'AI content checker tool. Verify if your text is AI-generated or human-written. Free instant analysis with no signup required.');
    setMetaTag('keywords', 'ai checker, ai content checker, check ai text, verify ai content, ai writing checker, content authenticity');
    setPropertyTag('og:title', 'AI Checker - Verify Content Authenticity');
    setPropertyTag('og:description', 'Free AI content checker. Instantly verify if text was written by AI or a human.');
  }, []);

  return <AIDetector />;
}
