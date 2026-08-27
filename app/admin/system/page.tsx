import { prisma } from "@/lib/database/prisma";
import { getDatabaseDeployment } from "@/lib/database/deployment";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  SUCCESS: "🟢",
  RUNNING: "🟡",
  FAILED: "🔴",
};

export default async function AdminSystemPage() {
  const databaseDeployment = getDatabaseDeployment();
  let compliance: Awaited<ReturnType<typeof prisma.providerComplianceReview.findMany>> = [];
  let recentRuns: Awaited<ReturnType<typeof prisma.workerRun.findMany>> = [];
  let listingCount = 0;
  let opportunityCount = 0;
  let discordCount = 0;
  let telegramCount = 0;
  let latestPriceAt: Date | null = null;
  let listingStatuses: Array<{ status: string; _count: { _all: number } }> = [];
  let databaseError: string | null = null;

  try {
    const latestPrice = prisma.priceSnapshot.findFirst({
      orderBy: { retrievedAt: "desc" },
      select: { retrievedAt: true },
    });
    [compliance, recentRuns, listingCount, opportunityCount, discordCount, telegramCount, latestPriceAt, listingStatuses] = await Promise.all([
      prisma.providerComplianceReview.findMany({ orderBy: { provider: "asc" } }),
      prisma.workerRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
      prisma.listing.count(),
      prisma.opportunity.count(),
      prisma.discordNotification.count({ where: { channel: "discord", success: true } }),
      prisma.discordNotification.count({ where: { channel: "telegram", success: true } }),
      latestPrice.then((price) => price?.retrievedAt ?? null),
      prisma.listing.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
  } catch {
    databaseError = process.env.DATABASE_URL
      ? "PostgreSQL est configuré mais ne répond pas. Vérifie Docker et la migration Prisma."
      : "DATABASE_URL n’est pas configurée. Copie .env.example vers .env puis démarre PostgreSQL.";
  }

  const jobNames = [...new Set(recentRuns.map((r) => r.jobName))];
  const maxPriceAgeHours = Number(process.env.CARDMARKET_MAX_PRICE_AGE_HOURS ?? 36);
  const priceAgeHours = latestPriceAt
    ? (Date.now() - latestPriceAt.getTime()) / 3_600_000
    : null;
  const priceIsFresh = priceAgeHours !== null && priceAgeHours <= maxPriceAgeHours;

  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <h1 className="mb-6 font-display text-2xl font-semibold text-slate-50">
        /admin/system
      </h1>

      {databaseError && (
        <div className="mb-6 rounded-card border border-market-loss bg-base-900 p-4 text-sm text-market-loss">
          🔴 {databaseError}
        </div>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className={databaseDeployment === "CLOUD_SHARED" ? "text-market-profit" : "text-signal-good"}>
            {databaseDeployment === "CLOUD_SHARED" ? "☁ Cloud partagée" : databaseDeployment === "LOCAL" ? "● Locale" : "○ Non configurée"}
          </div>
          <div className="text-xs text-slate-400">Base de données</div>
        </div>
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className="font-mono text-xl">{listingCount}</div>
          <div className="text-xs text-slate-400">Annonces collectées</div>
        </div>
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className="font-mono text-xl">{opportunityCount}</div>
          <div className="text-xs text-slate-400">Opportunités calculées</div>
        </div>
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className="font-mono text-xl">{discordCount} / {telegramCount}</div>
          <div className="text-xs text-slate-400">Notifications Discord / Telegram</div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className={priceIsFresh ? "text-market-profit" : "text-market-loss"}>
            {priceIsFresh ? "✓ Price Guide à jour" : "✗ Price Guide trop ancien"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {latestPriceAt
              ? `${latestPriceAt.toLocaleString("fr-FR")} · ${priceAgeHours?.toFixed(1)} h`
              : "Aucun prix importé"}
          </div>
        </div>
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className={process.env.GEMINI_API_KEY ? "text-market-profit" : "text-market-loss"}>
            {process.env.GEMINI_API_KEY ? "✓ Gemini configuré" : "✗ Clé Gemini absente"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {process.env.GEMINI_MODEL || "gemini-3.5-flash-lite (défaut)"}
          </div>
        </div>
        <div className="rounded-card border border-base-700 bg-base-900 p-4">
          <div className={process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID ? "text-market-profit" : "text-market-loss"}>
            {process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
              ? "✓ Telegram configuré"
              : "✗ Telegram incomplet"}
          </div>
          <div className="mt-1 text-xs text-slate-400">{telegramCount} alerte(s) envoyée(s)</div>
        </div>
      </section>

      <section className="mb-8 rounded-card border border-base-700 bg-base-900 p-5">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-slate-300">
          File des annonces
        </h2>
        <div className="flex flex-wrap gap-2">
          {listingStatuses.map((entry) => (
            <span key={entry.status} className="rounded-full border border-base-700 px-3 py-1 text-sm">
              {entry.status} · {entry._count._all}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-card border border-base-700 bg-base-900 p-5">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-slate-300">
          Conformité des providers (section 24)
        </h2>
        <div className="space-y-2">
          {compliance.map((c) => (
            <div key={c.provider} className="flex items-center justify-between border-b border-base-800 py-2 text-sm last:border-0">
              <span className="font-medium">{c.provider}</span>
              <span
                className={
                  c.status === "APPROVED"
                    ? "text-market-profit"
                    : c.status === "DISABLED"
                      ? "text-market-loss"
                      : "text-signal-good"
                }
              >
                {c.status}
              </span>
            </div>
          ))}
          {compliance.length === 0 && (
            <p className="text-sm text-slate-500">
              Aucune review — lancer <code>npm run prisma:seed</code>.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-card border border-base-700 bg-base-900 p-5">
        <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-slate-300">
          Derniers jobs (section 22)
        </h2>
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500">
          {jobNames.map((j) => (
            <span key={j} className="rounded-full border border-base-700 px-2 py-1">
              {j}
            </span>
          ))}
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-base-700 text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Job</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Démarré</th>
              <th className="py-2 pr-4">Terminé</th>
              <th className="py-2 pr-4">Essai</th>
              <th className="py-2">Erreur</th>
            </tr>
          </thead>
          <tbody>
            {recentRuns.map((run) => (
              <tr key={run.id} className="border-b border-base-800 last:border-0">
                <td className="py-2 pr-4 font-medium">{run.jobName}</td>
                <td className="py-2 pr-4">
                  {STATUS_DOT[run.status] ?? "⚪"} {run.status}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-slate-400">
                  {run.startedAt.toISOString()}
                </td>
                <td className="py-2 pr-4 font-mono text-xs text-slate-400">
                  {run.completedAt?.toISOString() ?? "—"}
                </td>
                <td className="py-2 pr-4">{run.retryCount}</td>
                <td className="py-2 text-signal-exceptional">{run.error ?? ""}</td>
              </tr>
            ))}
            {recentRuns.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-500">
                  Aucun job exécuté pour l&apos;instant — lance <code>npm run pipeline:run-once</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
