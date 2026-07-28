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

/** Returns the canonical site base URL, ensuring production URLs (e.g. nex-desk-tech.vercel.app) are used instead of localhost. */
export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  if (typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")) {
    return window.location.origin.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://nex-desk-tech.vercel.app";
  }
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://nex-desk-tech.vercel.app";
}
