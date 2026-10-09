import type { Plan, PlanId, PlanName } from "./types";

// Single source of truth for all investment plans.
export const PLANS: Plan[] = [
  { id: "starter", name: "Starter", amount: 2000,  remb: 1000,  gain: 2000,  featured: false },
  { id: "silver",  name: "Argent",  amount: 5000,  remb: 2500,  gain: 5000,  featured: false },
  { id: "gold",    name: "Or",      amount: 15000, remb: 7500,  gain: 15000, featured: true  },
  { id: "premium", name: "Premium", amount: 30000, remb: 15000, gain: 30000, featured: false },
];

export const PLAN_BY_AMOUNT: Record<number, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.amount, p])
);

export const PLAN_BY_ID: Record<string, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.id, p])
);

export const PLAN_BY_NAME: Record<string, Plan> = Object.fromEntries(
  PLANS.map((p) => [p.name, p])
);

export const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  PLANS.map((p) => [String(p.amount), p.name])
);

export const REFERRAL_COMMISSION = 500; // FCFA per referral who invests
export const INVESTMENT_DURATION_DAYS = 30;

// Helper: generate a unique referral code LEED-XX1234
export function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  let code = "LEED-";
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) code += digits[Math.floor(Math.random() * digits.length)];
  return code;
}

// Helper: generate a withdrawal reference WD-XXXX
export function generateWithdrawalRef(): string {
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `WD-${num}`;
}

// Helper: mask a phone number for privacy in referral lists
export function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return phone.slice(0, -4) + "XX XX";
}
