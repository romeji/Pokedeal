import { constants } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";

import { parse } from "dotenv";

const localEnvPath = ".env";
const cloudEnvPath = ".env.neon.local";
const backupPath = ".env.database-backup.local";

function replaceOrAppend(source: string, key: string, value: string) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(source)
    ? source.replace(pattern, line)
    : `${source.trimEnd()}\n${line}\n`;
}

async function main() {
  const [localRaw, cloudRaw] = await Promise.all([
    readFile(localEnvPath, "utf8"),
    readFile(cloudEnvPath, "utf8"),
  ]);
  const localValues = parse(localRaw);
  const cloudValues = parse(cloudRaw);
  const cloudUrl = cloudValues.DATABASE_URL;

  if (!cloudUrl || !/\.neon\.tech(?::|\/)/.test(cloudUrl)) {
    throw new Error("DATABASE_URL Neon invalide dans .env.neon.local");
  }

  if (localValues.DATABASE_URL !== cloudUrl) {
    try {
      await copyFile(localEnvPath, backupPath, constants.COPYFILE_EXCL);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
    }
  }

  let updated = replaceOrAppend(localRaw, "DATABASE_URL", cloudUrl);
  updated = replaceOrAppend(updated, "CARDMARKET_PRICE_RETENTION_DAYS", "7");
  await writeFile(localEnvPath, updated, { encoding: "utf8", mode: 0o600 });

  console.log("Base locale configurée sur Neon (sauvegarde privée conservée).");
}

main().catch((error) => {
  console.error("Bascule interrompue:", error);
  process.exitCode = 1;
});
