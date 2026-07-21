-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaderId" TEXT NOT NULL,
    CONSTRAINT "Asset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Declaration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownsRights" BOOLEAN NOT NULL,
    "agreedToTos" BOOLEAN NOT NULL,
    "agreedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,
    CONSTRAINT "Declaration_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,
    "reporterId" TEXT,
    CONSTRAINT "Report_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TakedownLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    CONSTRAINT "TakedownLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TakedownLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Declaration_assetId_key" ON "Declaration"("assetId");
