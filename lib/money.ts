// Whole units above 20, pence/cents below: "£145", "£12.50".
export function formatMoney(amount: number, currency: string): string {
  const digits = amount > 20 ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}
