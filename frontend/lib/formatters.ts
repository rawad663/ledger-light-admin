export function formatCurrencyCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCurrencyAmount(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatOrderId(uuid: string): string {
  return `ORD-${uuid.substring(0, 8).toUpperCase()}`;
}

export function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getInitials(name: string, maxWords: number = 2): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function dollarsToCents(dollars: string): number {
  const amount = Number.parseFloat(dollars);

  if (Number.isNaN(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

export function formatLocationAddress(location: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}): string {
  const street = [location.addressLine1, location.addressLine2]
    .filter(Boolean)
    .join(", ");
  const locality = [location.city, location.stateProvince, location.postalCode]
    .filter(Boolean)
    .join(", ");
  const parts = [street, locality, location.countryCode].filter(Boolean);

  return parts.length > 0 ? parts.join(" • ") : "No address provided";
}
