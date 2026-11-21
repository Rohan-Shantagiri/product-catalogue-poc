import type { MoneyDto } from "@catalogue/contracts";

export function formatPrice({ amountCents, currency }: MoneyDto): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(
    amountCents / 100,
  );
}
