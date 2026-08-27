import { categorizeScore, SCORE_CATEGORY_LABEL } from "@/lib/scoring/category";

const RING_COLOR: Record<string, string> = {
  EXCEPTIONNEL: "ring-signal-exceptional text-signal-exceptional",
  TRES_BON_DEAL: "ring-signal-great text-signal-great",
  BON_DEAL: "ring-signal-good text-signal-good",
  A_SURVEILLER: "ring-signal-watch text-signal-watch",
  IGNORER: "ring-signal-ignore text-signal-ignore",
};

export function ScoreBadge({ score }: { score: number }) {
  const category = categorizeScore(score);
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`grid h-9 w-9 place-items-center rounded-full ring-2 font-mono text-xs font-semibold ${RING_COLOR[category]}`}
      >
        {score}
      </span>
      <span className="text-xs text-slate-400">{SCORE_CATEGORY_LABEL[category]}</span>
    </div>
  );
}
