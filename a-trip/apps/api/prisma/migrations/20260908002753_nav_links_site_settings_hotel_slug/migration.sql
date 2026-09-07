-- Rename FooterLink -> NavLink and widen its groups to cover the header bar.
--
-- Written by hand rather than generated: Prisma's diff wanted to DROP the table
-- and CREATE a new one, which would have thrown away every configured link.
-- ALTER ... RENAME keeps the rows, the ids and the sort order intact.

-- 1. The enum gains HEADER and its footer values become explicit about which
--    column they mean. Postgres can rename enum values in place.
ALTER TYPE "FooterLinkGroup" RENAME TO "NavLinkGroup";
ALTER TYPE "NavLinkGroup" RENAME VALUE 'COMPANY' TO 'FOOTER_COMPANY';
ALTER TYPE "NavLinkGroup" RENAME VALUE 'SUPPORT' TO 'FOOTER_SUPPORT';
ALTER TYPE "NavLinkGroup" ADD VALUE 'HEADER' BEFORE 'FOOTER_COMPANY';

-- 2. The table, its primary key and its index follow the model name.
ALTER TABLE "FooterLink" RENAME TO "NavLink";
ALTER TABLE "NavLink" RENAME CONSTRAINT "FooterLink_pkey" TO "NavLink_pkey";
ALTER INDEX "FooterLink_group_sortOrder_idx" RENAME TO "NavLink_group_sortOrder_idx";

-- 3. Hotels remember the slugs they used to answer to, so renaming one does not
--    break links that are already out in the world.
ALTER TABLE "Hotel" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. A hotel with bookings cannot be deleted without orphaning them, so it is
--    archived instead: hidden from the site, still on record.
ALTER TYPE "HotelStatus" ADD VALUE 'ARCHIVED';

-- 5. Editable site copy that is not hotel data.
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "SiteSetting_group_idx" ON "SiteSetting"("group");
