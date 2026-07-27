export type DemoCase = {
  slug: string;
  title: string;
  client_name: string;
  industry: string;
  year: string;
  outcome: string;
  challenge: string;
  solution: string;
  services: string[];
  tech_stack: string[];
  metrics: { label: string; value: string }[];
  live_url?: string;
};

export type DemoPost = {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  read_minutes: number;
  published_at: string;
  content: string;
  cover_url?: string;
};

export type DemoService = {
  id?: string;
  slug: string;
  title: string;
  category: string;
  short_desc: string;
  long_desc?: string;
  starting_at?: number;
  currency?: string;
  features: string[];
  duration_note?: string;
  is_active?: boolean;
};

export type DemoQuote = {
  client_name: string;
  role: string;
  company: string;
  rating: number;
  quote: string;
};
