export interface IdentifiedItem {
  label: string;
  productType:
    | "CARD"
    | "BOOSTER"
    | "DISPLAY"
    | "ELITE_TRAINER_BOX"
    | "THEME_DECK"
    | "BOX_SET"
    | "TIN"
    | "BLISTER"
    | "COIN"
    | "TRAINER_KIT"
    | "OTHER";
  setCode: string | null;
  setName: string | null;
  number: string | null;
  language: string | null;
  rarity: string | null;
  edition: string | null;
  condition: string | null;
  confidenceScore: number; // 0-1
  imageQualityScore: number; // 0-1
  counterfeitRiskScore: number; // 0-1
  needsManualReview: boolean;
}

export interface VisionAnalysisResult {
  items: IdentifiedItem[];
}

export interface VisionProvider {
  readonly name: string;
  analyzeImages(imageUrls: string[], context?: { title?: string; description?: string }): Promise<VisionAnalysisResult>;
}
