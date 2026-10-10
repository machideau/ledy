-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "targetType" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Investment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remb" INTEGER NOT NULL,
    "gain" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "daysLeft" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tchinToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PendingPayment" (
    "id" TEXT NOT NULL,
    "tchinToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "payMethod" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredPhone" TEXT NOT NULL,
    "planName" TEXT,
    "amount" INTEGER,
    "commission" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RevokedToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "referralCode" TEXT NOT NULL,
    "referredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'user',
    "suspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "public"."AdminLog"("adminId" ASC);

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "public"."AdminLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Investment_tchinToken_idx" ON "public"."Investment"("tchinToken" ASC);

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "public"."Investment"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PendingPayment_tchinToken_key" ON "public"."PendingPayment"("tchinToken" ASC);

-- CreateIndex
CREATE INDEX "PendingPayment_userId_idx" ON "public"."PendingPayment"("userId" ASC);

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "public"."Referral"("referrerId" ASC);

-- CreateIndex
CREATE INDEX "RevokedToken_expiresAt_idx" ON "public"."RevokedToken"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "RevokedToken_token_idx" ON "public"."RevokedToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_token_key" ON "public"."RevokedToken"("token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone" ASC);

-- CreateIndex
CREATE INDEX "User_referralCode_idx" ON "public"."User"("referralCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "public"."User"("referralCode" ASC);

-- CreateIndex
CREATE INDEX "Withdrawal_userId_idx" ON "public"."Withdrawal"("userId" ASC);

-- AddForeignKey
ALTER TABLE "public"."AdminLog" ADD CONSTRAINT "AdminLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
