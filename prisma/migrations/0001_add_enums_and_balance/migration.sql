-- Migration: Add enums and denormalised balance column
-- Enums were already created by the previous partial run.
-- This migration casts existing TEXT columns to enum types (data-preserving)
-- and adds the balance column.

-- ── 1. Investment.status TEXT → InvestmentStatus enum ────────────────────────
ALTER TABLE "Investment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Investment"
  ALTER COLUMN "status" TYPE "InvestmentStatus"
    USING "status"::"InvestmentStatus";
ALTER TABLE "Investment" ALTER COLUMN "status" SET DEFAULT 'active';

-- ── 2. PendingPayment.status TEXT → PendingPaymentStatus enum ────────────────
ALTER TABLE "PendingPayment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PendingPayment"
  ALTER COLUMN "status" TYPE "PendingPaymentStatus"
    USING "status"::"PendingPaymentStatus";
ALTER TABLE "PendingPayment" ALTER COLUMN "status" SET DEFAULT 'pending';

-- ── 3. Referral.status TEXT → ReferralStatus enum ────────────────────────────
ALTER TABLE "Referral" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Referral"
  ALTER COLUMN "status" TYPE "ReferralStatus"
    USING "status"::"ReferralStatus";
ALTER TABLE "Referral" ALTER COLUMN "status" SET DEFAULT 'pending';

-- ── 4. User.role TEXT → UserRole enum ────────────────────────────────────────
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
    USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';

-- ── 5. Withdrawal.status TEXT → WithdrawalStatus enum ────────────────────────
ALTER TABLE "Withdrawal" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Withdrawal"
  ALTER COLUMN "status" TYPE "WithdrawalStatus"
    USING "status"::"WithdrawalStatus";
ALTER TABLE "Withdrawal" ALTER COLUMN "status" SET DEFAULT 'pending';

-- ── 6. Add denormalised balance column ───────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "balance" INTEGER NOT NULL DEFAULT 0;
