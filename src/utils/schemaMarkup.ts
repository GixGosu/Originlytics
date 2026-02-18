/**
 * Schema Markup Utilities
 * Generate JSON-LD structured data for SEO
 */

export interface SoftwareAppSchema {
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  offers?: {
    price: string;
    priceCurrency: string;
  };
  aggregateRating?: {
    ratingValue: number;
    ratingCount: number;
  };
}

/**
 * Generate SoftwareApplication schema for tool pages
 */
export function generateSoftwareAppSchema(config: SoftwareAppSchema): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: config.name,
    description: config.description,
    url: config.url,
    applicationCategory: config.applicationCategory,
    operatingSystem: config.operatingSystem,
    offers: config.offers ? {
      '@type': 'Offer',
      price: config.offers.price,
      priceCurrency: config.offers.priceCurrency
    } : {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    ...(config.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: config.aggregateRating.ratingValue,
        ratingCount: config.aggregateRating.ratingCount
      }
    })
  };

  return JSON.stringify(schema);
}

export interface FAQSchema {
  question: string;
  answer: string;
}

/**
 * Generate FAQPage schema
 */
export function generateFAQSchema(faqs: FAQSchema[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };

  return JSON.stringify(schema);
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  return JSON.stringify(schema);
}

/**
 * Inject schema into document head
 */
export function injectSchema(schemaJson: string, id: string): void {
  // Remove existing schema with same id
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  // Create and inject new schema
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.textContent = schemaJson;
  document.head.appendChild(script);
}

/**
 * Remove schema from document head
 */
export function removeSchema(id: string): void {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }
}
