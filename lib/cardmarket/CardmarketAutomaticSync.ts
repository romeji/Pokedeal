import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CardmarketCatalogImporter } from "@/lib/cardmarket/CardmarketCatalogImporter";
import { CardmarketPriceImporter } from "@/lib/cardmarket/CardmarketPriceImporter";
import {
  assertOfficialCardmarketDownloadUrl,
  CARDMARKET_OFFICIAL_DOWNLOADS,
  type CardmarketDownloadKey,
  validateCardmarketPayload,
} from "@/lib/cardmarket/officialDownloads";
import { prisma } from "@/lib/database/prisma";

interface DownloadState {
  etag?: string;
  lastModified?: string;
}

interface SyncManifest {
  files: Partial<Record<CardmarketDownloadKey, DownloadState>>;
}

interface DownloadResult {
  changed: boolean;
  path: string;
  createdAt: string;
  entries: number;
  state: DownloadState;
}

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export interface CardmarketSyncResult {
  downloads: Record<CardmarketDownloadKey, { changed: boolean; createdAt: string; entries: number }>;
  catalog: { imported: number; setsCreated: number } | { skipped: true };
  prices: Awaited<ReturnType<CardmarketPriceImporter["run"]>>;
  retention: { enabled: false } | { enabled: true; days: number; deleted: number };
}

export class CardmarketAutomaticSync {
  private readonly manifestPath: string;

  constructor(private readonly dataDirectory = path.resolve("data", "cardmarket")) {
    this.manifestPath = path.join(this.dataDirectory, "download-state.json");
  }

  async run(): Promise<CardmarketSyncResult> {
    await mkdir(this.dataDirectory, { recursive: true });
    const manifest = await this.readManifest();
    const nextManifest: SyncManifest = { files: { ...manifest.files } };

    const singles = await this.download("singles", manifest.files.singles);
    const nonSingles = await this.download("nonSingles", manifest.files.nonSingles);
    const prices = await this.download("prices", manifest.files.prices);

    nextManifest.files.singles = singles.state;
    nextManifest.files.nonSingles = nonSingles.state;
    nextManifest.files.prices = prices.state;

    const productCount = await prisma.cardmarketProduct.count();
    const catalogChanged = singles.changed || nonSingles.changed || productCount === 0;
    const catalog = catalogChanged
      ? await new CardmarketCatalogImporter(singles.path, nonSingles.path).run()
      : ({ skipped: true } as const);

    const priceResult = await new CardmarketPriceImporter(prices.path).run();
    const retention = await this.applyPriceRetention();
    await this.writeManifest(nextManifest);

    return {
      downloads: {
        singles: this.downloadSummary(singles),
        nonSingles: this.downloadSummary(nonSingles),
        prices: this.downloadSummary(prices),
      },
      catalog,
      prices: priceResult,
      retention,
    };
  }

  private async applyPriceRetention(): Promise<CardmarketSyncResult["retention"]> {
    const rawDays = process.env.CARDMARKET_PRICE_RETENTION_DAYS?.trim();
    if (!rawDays) return { enabled: false };
    const days = Number(rawDays);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      throw new Error("CARDMARKET_PRICE_RETENTION_DAYS doit être un entier entre 1 et 3650");
    }
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await prisma.priceSnapshot.deleteMany({
      where: { retrievedAt: { lt: cutoff } },
    });
    return { enabled: true, days, deleted: result.count };
  }

  private downloadSummary(result: DownloadResult) {
    return { changed: result.changed, createdAt: result.createdAt, entries: result.entries };
  }

  private async download(key: CardmarketDownloadKey, previous?: DownloadState): Promise<DownloadResult> {
    const definition = CARDMARKET_OFFICIAL_DOWNLOADS[key];
    assertOfficialCardmarketDownloadUrl(definition.url);
    const destination = path.join(this.dataDirectory, definition.fileName);
    const headers = new Headers({ Accept: "application/json" });

    // Le fournisseur peut répondre 304 : on conserve alors le fichier local
    // déjà validé au lieu de télécharger plusieurs dizaines de Mo.
    if (await this.fileExists(destination)) {
      if (previous?.etag) headers.set("If-None-Match", previous.etag);
      if (previous?.lastModified) headers.set("If-Modified-Since", previous.lastModified);
    }

    const response = await fetch(definition.url, { headers, redirect: "error" });
    if (response.status === 304) {
      const metadata = await this.validateFile(destination, definition.rootArray);
      return { changed: false, path: destination, ...metadata, state: previous ?? {} };
    }
    if (!response.ok) {
      throw new Error(`Téléchargement Cardmarket ${definition.fileName} : HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_BYTES) {
      throw new Error(`Fichier Cardmarket trop volumineux : ${contentLength} octets`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(`Fichier Cardmarket trop volumineux : ${bytes.byteLength} octets`);
    }

    const temporary = `${destination}.tmp`;
    try {
      await writeFile(temporary, bytes);
      const metadata = await this.validateFile(temporary, definition.rootArray);
      await rename(temporary, destination);
      return {
        changed: true,
        path: destination,
        ...metadata,
        state: {
          etag: response.headers.get("etag") ?? undefined,
          lastModified: response.headers.get("last-modified") ?? undefined,
        },
      };
    } finally {
      await rm(temporary, { force: true });
    }
  }

  private async validateFile(filePath: string, rootArray: "products" | "priceGuides") {
    const raw = await readFile(filePath, "utf8");
    return validateCardmarketPayload(JSON.parse(raw) as unknown, rootArray);
  }

  private async readManifest(): Promise<SyncManifest> {
    try {
      return JSON.parse(await readFile(this.manifestPath, "utf8")) as SyncManifest;
    } catch {
      return { files: {} };
    }
  }

  private async writeManifest(manifest: SyncManifest): Promise<void> {
    const temporary = `${this.manifestPath}.tmp`;
    await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rename(temporary, this.manifestPath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await readFile(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
