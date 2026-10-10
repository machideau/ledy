-- Add unique constraint on (referrerId, referredPhone) to prevent double-commission:
-- a sponsor can only receive commission once per referred phone number.
-- This also makes findUnique({ referrerId_referredPhone: ... }) possible in the
-- webhook handler, eliminating the race condition that could credit the commission twice.

CREATE UNIQUE INDEX IF NOT EXISTS "Referral_referrerId_referredPhone_key"
  ON "Referral"("referrerId", "referredPhone");
