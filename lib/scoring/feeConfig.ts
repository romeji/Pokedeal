/**
 * Frais configurables (section 13) — tous lus depuis l'environnement,
 * jamais en dur dans le code. Voir .env.example pour les valeurs de
 * départ et leurs sources (certaines, comme les frais Vinted, sont des
 * ordres de grandeur à vérifier toi-même — jamais inventés comme des
 * faits certains).
 */
export interface FeeConfig {
  platformFeePercent: number;
  buyerProtectionFeePercent: number;
  shippingCostDefault: number;
  resaleFeePercent: number;
  riskMarginPercent: number;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function loadFeeConfig(): FeeConfig {
  return {
    platformFeePercent: envNumber("PLATFORM_FEE_PERCENT", 0),
    buyerProtectionFeePercent: envNumber("BUYER_PROTECTION_FEE_PERCENT", 5),
    shippingCostDefault: envNumber("SHIPPING_COST_DEFAULT_EUR", 5),
    resaleFeePercent: envNumber("RESALE_FEE_PERCENT", 5),
    riskMarginPercent: envNumber("RISK_MARGIN_PERCENT", 10),
  };
}
