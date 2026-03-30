-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('STORE', 'WAREHOUSE', 'POP_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Location"
ADD COLUMN     "code" VARCHAR(50),
ADD COLUMN     "type" "LocationType" NOT NULL DEFAULT 'STORE',
ADD COLUMN     "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "addressLine1" VARCHAR(255) NOT NULL DEFAULT '',
ADD COLUMN     "addressLine2" VARCHAR(255),
ADD COLUMN     "stateProvince" VARCHAR(120),
ADD COLUMN     "postalCode" VARCHAR(40),
ADD COLUMN     "countryCode" VARCHAR(2) NOT NULL DEFAULT 'CA',
ADD COLUMN     "notes" TEXT;

-- Migrate existing address fields into the new shape
UPDATE "Location"
SET "addressLine1" = "address";

-- AlterTable
ALTER TABLE "Location"
DROP COLUMN "address";

-- AlterTable
ALTER TABLE "Location"
ALTER COLUMN "city" TYPE VARCHAR(120);

-- CreateIndex
CREATE UNIQUE INDEX "Location_organizationId_code_key" ON "Location"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Location_organizationId_name_idx" ON "Location"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Location_organizationId_status_idx" ON "Location"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Location_organizationId_type_idx" ON "Location"("organizationId", "type");
