// Base exchange rates relative to 1 USD
export const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  PKR: 278.5,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.36,
  AUD: 1.5,
  INR: 83.5,
  QAR: 3.64,
  KWD: 0.31,
};

/**
 * Convert an amount from one currency to another using exchange rates.
 */
export function convertCurrency(
  amount: number,
  from: string = "PKR",
  to: string = "USD",
  customRates?: Record<string, number>
): number {
  if (!amount || isNaN(amount)) return 0;
  const rates = customRates || DEFAULT_RATES;
  const fromUpper = (from || "PKR").toUpperCase();
  const toUpper = (to || "USD").toUpperCase();

  if (fromUpper === toUpper) return amount;

  const fromRate = rates[fromUpper] || DEFAULT_RATES[fromUpper] || 1.0;
  const toRate = rates[toUpper] || DEFAULT_RATES[toUpper] || 1.0;

  // Convert amount to base USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const converted = amountInUSD * toRate;

  return Math.round(converted * 100) / 100;
}

/**
 * Fetch live exchange rates from public API with fallback
 */
export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.rates) {
        return { ...DEFAULT_RATES, ...data.rates };
      }
    }
  } catch (e) {
    console.error("Exchange rates fetch error:", e);
  }
  return DEFAULT_RATES;
}
