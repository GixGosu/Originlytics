export interface Testimonial {
  id: string;
  content: string;
  name: string;
  role: string;
  company: string;
  rating: number;
  verified: boolean;
  avatar?: string;
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    content: 'OriginLytics has transformed how we evaluate content authenticity. The AI detection accuracy is remarkable, and the detailed metrics give us confidence in our content decisions.',
    name: 'Sarah Chen',
    role: 'Content Strategy Lead',
    company: 'TechCorp Media',
    rating: 5,
    verified: true,
  },
  {
    id: '2',
    content: 'The SEO analysis features are incredible. We\'ve improved our rankings significantly by following the actionable recommendations. Best investment for our content team.',
    name: 'Marcus Johnson',
    role: 'Head of SEO',
    company: 'Digital Growth Agency',
    rating: 5,
    verified: true,
  },
  {
    id: '3',
    content: 'As an academic institution, verifying content authenticity is critical. OriginLytics provides the transparency and accuracy we need to maintain academic integrity.',
    name: 'Dr. Emily Rodriguez',
    role: 'Director of Academic Standards',
    company: 'State University',
    rating: 5,
    verified: true,
  },
  {
    id: '4',
    content: 'The emotional tone analysis has been a game-changer for our brand messaging. We can now ensure our content resonates with our audience on an emotional level.',
    name: 'James Park',
    role: 'Brand Manager',
    company: 'Creative Studio Co',
    rating: 5,
    verified: true,
  },
  {
    id: '5',
    content: 'Fast, accurate, and incredibly detailed. The accessibility insights alone have helped us make our content more inclusive. Highly recommend for any content team.',
    name: 'Lisa Thompson',
    role: 'VP of Content',
    company: 'Enterprise Solutions',
    rating: 5,
    verified: true,
  },
  {
    id: '6',
    content: 'We use OriginLytics daily to verify user-generated content. The API integration was seamless, and the support team is exceptional. Worth every penny.',
    name: 'David Kim',
    role: 'CTO',
    company: 'Social Platform Inc',
    rating: 5,
    verified: true,
  },
];
