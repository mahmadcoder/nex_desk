export type ProcessStep = {
  step_no: string;
  title: string;
  description: string;
};

export type PricingTier = {
  key: "basic" | "standard" | "enterprise";
  name: string;
  price: number | null;
  price_label: string;
  short_desc: string;
  delivery_time: string;
  features: string[];
  is_popular?: boolean;
  cta_text: string;
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
}
