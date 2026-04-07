-- Team management schema

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITE_SENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITE_RESENT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INVITE_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ROLE_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMBER_REACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOCATION_SCOPE_CHANGED';

-- AlterEnum
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'MEMBERSHIP';

-- AlterTable
ALTER TABLE "Membership"
ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "invitedAt" TIMESTAMP(3),
ADD COLUMN "activatedAt" TIMESTAMP(3),
ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User"
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MembershipLocation" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Membership_organizationId_status_idx" ON "Membership"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipLocation_membershipId_locationId_key" ON "MembershipLocation"("membershipId", "locationId");

-- CreateIndex
CREATE INDEX "MembershipLocation_locationId_idx" ON "MembershipLocation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_tokenHash_key" ON "InviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InviteToken_membershipId_expiresAt_idx" ON "InviteToken"("membershipId", "expiresAt");

-- AddForeignKey
ALTER TABLE "MembershipLocation" ADD CONSTRAINT "MembershipLocation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipLocation" ADD CONSTRAINT "MembershipLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteToken" ADD CONSTRAINT "InviteToken_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
