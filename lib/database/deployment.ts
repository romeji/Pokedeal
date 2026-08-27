export type DatabaseDeployment = "LOCAL" | "CLOUD_SHARED" | "UNCONFIGURED";

export function getDatabaseDeployment(databaseUrl = process.env.DATABASE_URL): DatabaseDeployment {
  if (!databaseUrl) return "UNCONFIGURED";
  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "db" ||
      hostname === "host.docker.internal"
    ) {
      return "LOCAL";
    }
    return "CLOUD_SHARED";
  } catch {
    return "UNCONFIGURED";
  }
}
