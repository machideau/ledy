// Client-side API helpers. All methods return JSON or throw an Error
// with the server-provided error message.

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiClientError(data.error || "Une erreur est survenue.", res.status);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────
import type {
  AuthResponse,
  DashboardData,
  UserPublic,
  InvestmentDTO,
  WithdrawalDTO,
  ReferralDTO,
} from "./types";

export const api = {
  register: (body: { phone: string; password: string; referralCode?: string }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { phone: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ success: boolean }>("/api/auth/logout", { method: "POST" }),

  me: () => request<UserPublic>("/api/auth/me"),

  dashboard: () => request<DashboardData>("/api/dashboard"),

  invest: (body: { planId: string; paymentMethod: string; phone: string }) =>
    request<InvestmentDTO>("/api/investments", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  investments: () => request<InvestmentDTO[]>("/api/investments"),

  referrals: () =>
    request<{
      referrals: ReferralDTO[];
      stats: {
        total: number;
        totalEarned: number;
        totalPending: number;
        countPaid: number;
        countPending: number;
        commissionPerReferral: number;
      };
      referralCode: string;
      referralLink: string;
    }>("/api/referrals"),

  withdrawals: () =>
    request<{ withdrawals: WithdrawalDTO[] }>("/api/withdrawals"),

  withdraw: (body: { method: string; phone: string; amount: number }) =>
    request<WithdrawalDTO>("/api/withdrawals", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProfile: (body: { name?: string; phone?: string }) =>
    request<UserPublic>("/api/user", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>("/api/user", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // ── Tchin payment ──────────────────────────
  tchinPay: (body: { planId: string; paymentMethod: string; phone: string }) =>
    request<{ token: string; payment_url: string; env: string }>("/api/tchin/pay", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  tchinStatus: (token: string) =>
    request<{ status: "pending" | "completed" | "failed"; token: string }>(
      `/api/tchin/status?token=${encodeURIComponent(token)}`
    ),
};
