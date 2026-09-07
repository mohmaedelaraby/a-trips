-- CreateEnum
CREATE TYPE "FooterLinkGroup" AS ENUM ('COMPANY', 'SUPPORT');

-- CreateTable
CREATE TABLE "FooterLink" (
    "id" TEXT NOT NULL,
    "group" "FooterLinkGroup" NOT NULL,
    "value" TEXT NOT NULL,
    "href" TEXT,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FooterLink_group_sortOrder_idx" ON "FooterLink"("group", "sortOrder");
