export const INACTIVE_LISTING_STATUSES = ["SOLD", "REMOVED", "EXPIRED"] as const;
export const INACTIVE_OPPORTUNITY_STATUSES = ["SOLD", "IGNORED"] as const;

export function isActiveDealStatus(listingStatus: string, opportunityStatus: string) {
  return !INACTIVE_LISTING_STATUSES.includes(listingStatus as (typeof INACTIVE_LISTING_STATUSES)[number])
    && !INACTIVE_OPPORTUNITY_STATUSES.includes(opportunityStatus as (typeof INACTIVE_OPPORTUNITY_STATUSES)[number]);
}

export function dealVerificationLabel(listingStatus: string) {
  if (listingStatus === "REVIEW_REQUIRED") return "À vérifier";
  if (listingStatus === "SCORED") return "Cotation calculée";
  return "En cours d’analyse";
}
