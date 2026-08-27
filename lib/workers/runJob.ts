import { prisma } from "@/lib/database/prisma";

/**
 * Enveloppe chaque job avec le suivi minimal demandé section 22 :
 * status, startedAt, completedAt, error, retryCount. Simple et gratuit
 * (une table Postgres), pas de file d'attente distribuée en V1.
 */
export async function runJob<T>(
  jobName: string,
  fn: () => Promise<T>,
  options: { maxRetries?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 0;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    const run = await prisma.workerRun.create({
      data: { jobName, status: "RUNNING", retryCount: attempt },
    });

    try {
      const result = await fn();
      await prisma.workerRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          resultSummary: (result ?? null) as never,
        },
      });
      return result;
    } catch (err) {
      lastError = err;
      await prisma.workerRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error: err instanceof Error ? err.message : String(err),
        },
      });
      attempt++;
    }
  }

  throw lastError;
}
