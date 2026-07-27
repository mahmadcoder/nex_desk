export interface IMetric {
  label: string;
  value: string;
}

export interface ICaseStudy {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  cover_url: string | null;
  challenge: string | null;
  solution: string | null;
  outcome: string | null;
  metrics: IMetric[] | null;
  tech_stack: string[] | null;
  services: string[] | null;
  live_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface ITestimonial {
  id: string;
  client_name: string;
  role: string | null;
  company: string | null;
  avatar_url: string | null;
  quote: string;
  rating: number | null;
  is_published: boolean;
  sort_order: number;
}

export interface IFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface IPricingTier {
  key: string;
  name: string;
  price: number | null;
  price_label: string;
  short_desc: string;
  delivery_time: string;
  features: string[];
  is_popular?: boolean;
  cta_text: string;
}

export interface IService {
  id: string;
  slug: string;
  title: string;
  category: string;
  short_desc: string | null;
  long_desc?: string | null;
  starting_at: number | null;
  currency: string | null;
  duration_note?: string | null;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  pricing_tiers?: IPricingTier[];
}
