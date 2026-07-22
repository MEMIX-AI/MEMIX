-- AlterTable
ALTER TABLE "Report" ADD COLUMN "reviewNote" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "fileSize" INTEGER NOT NULL,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isOriginal" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "uploaderWallet" TEXT,
    CONSTRAINT "Asset_uploaderWallet_fkey" FOREIGN KEY ("uploaderWallet") REFERENCES "User" ("walletAddress") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("createdAt", "description", "downloadCount", "duration", "fileSize", "fileUrl", "id", "isOriginal", "status", "thumbnailUrl", "title", "type", "updatedAt", "uploaderWallet") SELECT "createdAt", "description", "downloadCount", "duration", "fileSize", "fileUrl", "id", "isOriginal", "status", "thumbnailUrl", "title", "type", "updatedAt", "uploaderWallet" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE TABLE "new_TakedownLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionBy" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT,
    "targetWallet" TEXT,
    "relatedReportId" TEXT,
    CONSTRAINT "TakedownLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TakedownLog_relatedReportId_fkey" FOREIGN KEY ("relatedReportId") REFERENCES "Report" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TakedownLog" ("action", "actionBy", "assetId", "createdAt", "id", "reason", "relatedReportId") SELECT "action", "actionBy", "assetId", "createdAt", "id", "reason", "relatedReportId" FROM "TakedownLog";
DROP TABLE "TakedownLog";
ALTER TABLE "new_TakedownLog" RENAME TO "TakedownLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
