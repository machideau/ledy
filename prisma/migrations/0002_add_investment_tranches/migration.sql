-- Add 3-tranche payout columns to Investment
-- Each tranche = amount (= gain/3), paid at J+10, J+20, J+30
-- NULL means the tranche has not yet been paid.

ALTER TABLE "Investment"
  ADD COLUMN "tranche1PaidAt" TIMESTAMP(3),
  ADD COLUMN "tranche2PaidAt" TIMESTAMP(3),
  ADD COLUMN "tranche3PaidAt" TIMESTAMP(3);
