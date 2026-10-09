// Shared types used across API routes and client components.

export type PlanId = "starter" | "silver" | "gold" | "premium";
export type PlanName = "Starter" | "Argent" | "Or" | "Premium";
export type PaymentMethod = "flooz" | "tmoney";
export type InvestmentStatus = "active" | "completed";
export type ReferralStatus = "pending" | "paid";
export type WithdrawalStatus = "pending" | "paid";

export interface Plan {
  id: PlanId;
  name: PlanName;
  amount: number;
  remb: number;   // 50 % immediate refund
  gain: number;   // doubled at J+30
  featured: boolean;
}

export interface UserPublic {
  id: string;
  phone: string;
  name: string | null;
  referralCode: string;
}

export interface InvestmentDTO {
  id: string;
  planName: PlanName;
  amount: number;
  remb: number;
  gain: number;
  status: InvestmentStatus;
  daysLeft: number;
  expiresAt: string;   // ISO string — used for live countdown
  createdAt: string;
}

export interface ReferralDTO {
  id: string;
  phone: string;           // referred person's phone (masked)
  planName: PlanName | null;
  amount: number | null;
  commission: number;
  status: ReferralStatus;
  createdAt: string;
}

export interface WithdrawalDTO {
  id: string;
  amount: number;
  method: PaymentMethod;
  phone: string;
  status: WithdrawalStatus;
  type: string;
  ref: string;
  createdAt: string;
}

export interface DashboardData {
  user: UserPublic;
  walletBalance: number;
  totalInvested: number;
  referralEarnings: number;
  pendingReferrals: number;
  investments: InvestmentDTO[];
  referrals: ReferralDTO[];
  referralLink: string;
}

// ── API response wrappers ──────────────────────
export interface ApiError {
  error: string;
}

export interface AuthResponse {
  user: UserPublic;
}
