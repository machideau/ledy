// Shared types used across API routes and client components.

export type PlanId = "starter" | "silver" | "gold" | "premium";
export type PlanName = "Starter" | "Argent" | "Or" | "Premium";
export type PaymentMethod = "flooz" | "tmoney";
export type InvestmentStatus = "active" | "completed";
export type ReferralStatus = "pending" | "paid";
export type WithdrawalStatus = "pending" | "paid" | "cancelled";

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
  REFERRAL_COMMISSION: number;
}

// ── API response wrappers ──────────────────────
export interface ApiError {
  error: string;
}

export interface AuthResponse {
  user: UserPublic;
}

// ── Admin (douyin) panel types (#13) ──────────
// Defined here so server routes and the client page share a single source of truth.

export interface AdminStats {
  period: string;
  userCount: number;
  investmentCount: number;
  activeInvestments: number;
  completedInvestments: number;
  withdrawalCount: number;
  pendingWithdrawalCount: number;
  totalInvested: number;
  totalGainsPaid: number;
  totalWithdrawn: number;
  pendingWithdrawalAmount: number;
  totalCommissions: number;
  planBreakdown: {
    planName: string;
    count: number;
    totalInvested: number;
    totalGain: number;
  }[];
}

export interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  suspended: boolean;
  referralCode: string;
  referredBy: string | null;
  createdAt: string;
  investmentCount: number;
  activeInvestments: number;
  totalInvested: number;
  totalRemb: number;
  totalGains: number;
  totalCommissions: number;
  totalWithdrawn: number;
  walletBalance: number;
}

export interface AdminWithdrawal {
  id: string;
  amount: number;
  method: string;
  phone: string;
  status: string;
  type: string;
  ref: string;
  note: string | null;
  createdAt: string;
  user: { phone: string; name: string | null };
}

export interface AdminInvestment {
  id: string;
  planName: string;
  amount: number;
  remb: number;
  gain: number;
  status: string;
  daysLeft: number;
  expiresAt: string;
  createdAt: string;
  user: { phone: string; name: string | null };
}

export interface AdminReferral {
  id: string;
  referredPhone: string;
  planName: string | null;
  amount: number | null;
  commission: number;
  status: string;
  createdAt: string;
  referrer: { phone: string; name: string | null; referralCode: string };
}

export interface AdminLog {
  id: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  admin: { phone: string; name: string | null };
  target: { phone: string; name: string | null } | null;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ReferralGlobalStats {
  total: number;
  paidCount: number;
  totalCommission: number;
  conversionRate: number;
}
