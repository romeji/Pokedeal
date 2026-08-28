import { Prisma } from "@prisma/client";
import { prisma } from "../database/prisma";

export function recordCollectionActivity(
  binderId: string,
  action: string,
  entryName?: string | null,
  details?: Prisma.InputJsonValue,
) {
  return prisma.collectionActivity.create({
    data: { binderId, action, entryName: entryName || null, details },
  });
}
