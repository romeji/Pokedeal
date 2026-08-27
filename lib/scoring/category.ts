export type ScoreCategory =
  | "EXCEPTIONNEL"
  | "TRES_BON_DEAL"
  | "BON_DEAL"
  | "A_SURVEILLER"
  | "IGNORER";

export const SCORE_CATEGORY_LABEL: Record<ScoreCategory, string> = {
  EXCEPTIONNEL: "🔥 EXCEPTIONNEL",
  TRES_BON_DEAL: "🚨 TRÈS BON DEAL",
  BON_DEAL: "🟠 BON DEAL",
  A_SURVEILLER: "🟡 À SURVEILLER",
  IGNORER: "⚪ IGNORER",
};

export function categorizeScore(score: number): ScoreCategory {
  if (score >= 90) return "EXCEPTIONNEL";
  if (score >= 80) return "TRES_BON_DEAL";
  if (score >= 70) return "BON_DEAL";
  if (score >= 60) return "A_SURVEILLER";
  return "IGNORER";
}
