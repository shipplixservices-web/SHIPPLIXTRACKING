import { getAppSettings } from "./settingsUtils.ts";

/**
 * Centered currency utility that reads the baseCurrency configuration
 * from business settings and formats the numeric amount.
 */
export function getCurrencySymbol(baseCurrency?: string): string {
  try {
    const settings = getAppSettings();
    const currencyStr = baseCurrency || settings.currencies?.baseCurrency || "NGN (₦)";
    // Extract symbol in parentheses like "NGN (₦)" -> "₦" or "EUR (€)" -> "€"
    const match = currencyStr.match(/\(([^)]+)\)/);
    return match ? match[1] : "₦";
  } catch (e) {
    return "₦";
  }
}

/**
 * Format a numeric amount using the active business currency.
 * Keeps support for other currencies in the architecture, but defaults to NGN.
 */
export function formatCurrency(amount: number, baseCurrency?: string): string {
  const symbol = getCurrencySymbol(baseCurrency);
  
  // Format numeric value nicely with two decimal places.
  // Standard formatting is Symbol followed by the formatted number.
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

  return `${symbol}${formatted}`;
}

/**
 * Format a numeric amount using the active business currency without fraction digits if they are .00
 * Useful for high-level dashboard metrics or charts to keep them clean.
 */
export function formatCurrencyShort(amount: number, baseCurrency?: string): string {
  const symbol = getCurrencySymbol(baseCurrency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

  return `${symbol}${formatted}`;
}
