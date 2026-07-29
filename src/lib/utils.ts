import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

const SYMBOL: Record<string, string> = {
  PKR: "Rs", USD: "$", GBP: "£", EUR: "€", AED: "AED",
};

export function money(amount: number, currency = "USD") {
  return `${SYMBOL[currency] ?? currency}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Replaces {{variables}} in an email template body. */
export function fillTemplate(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    vars[k] !== undefined ? String(vars[k]) : m
  );
}

export const adminPath = (sub = "") =>
  `/${process.env.NEXT_PUBLIC_ADMIN_PATH || "nx-control"}${sub}`;

/** Returns the canonical site base URL, ensuring the primary public domain (https://nex-desk-tech.vercel.app) is used instead of Vercel preview deployment URLs. */
export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  // Public production domain fallback
  return "https://nex-desk-tech.vercel.app";
}
