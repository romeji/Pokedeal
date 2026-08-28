type EbaySearchItem = { price?: { value?: string; currency?: string }; itemWebUrl?: string };
type EbaySearchResponse = { itemSummaries?: EbaySearchItem[] };

let cachedToken: { value: string; expiresAt: number } | null = null;

async function applicationToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const body = await response.json() as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

export async function getEbayActiveMarket(query: string) {
  const token = await applicationToken();
  if (!token) return { configured: false, median: null, count: 0, url: null };
  const params = new URLSearchParams({ q: query, limit: "50", filter: "buyingOptions:{FIXED_PRICE}" });
  const response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_FR" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { configured: true, median: null, count: 0, url: null };
  const body = await response.json() as EbaySearchResponse;
  const items = body.itemSummaries ?? [];
  const prices = items.flatMap((item) => item.price?.currency === "EUR" && Number(item.price.value) > 0 ? [Number(item.price.value)] : []).sort((a, b) => a - b);
  return { configured: true, median: prices.length ? prices[Math.floor(prices.length / 2)]! : null, count: prices.length, url: items[0]?.itemWebUrl ?? null };
}
