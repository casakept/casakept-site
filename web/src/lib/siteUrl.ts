// Absolute base URL for links sent to customers (emails and texts).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function upgradeOfferUrl(token: string): string {
  return `${SITE_URL}/upgrade/${token}`;
}
