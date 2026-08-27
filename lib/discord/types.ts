export interface OpportunityNotificationPayload {
  productName: string;
  listingUrl: string;
  imageUrl: string | null;
  purchasePrice: number;
  marketValue: number;
  discountPercent: number;
  estimatedProfit: number;
  roi: number;
  score: number;
  category: string;
  confidence: number;
  riskLabel: "Faible" | "Modéré" | "Élevé";
}

export interface NotificationProvider {
  readonly name: string;
  sendOpportunity(payload: OpportunityNotificationPayload): Promise<{ success: boolean; error?: string }>;
}
