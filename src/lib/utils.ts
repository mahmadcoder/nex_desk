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
