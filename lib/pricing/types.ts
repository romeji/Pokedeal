export interface PriceResult {
  price: number;
  currency: string;
  source: string;
  confidence: number; // 0-1
  sampleSize: number | null;
  retrievedAt: Date;
}

export interface PriceProvider {
  readonly name: string;
  getProductPrice(cardmarketProductId: string): Promise<PriceResult | null>;
}
