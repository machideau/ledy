// Tchin Mobile Money API wrapper
// Base URL: https://tchin.tech/api/v1
// Docs: https://doc.tchin.tech

const TCHIN_BASE = "https://tchin.tech/api/v1";

function tchinHeaders() {
  return {
    "Content-Type": "application/json",
    "TCHIN-PUBLIC-KEY": process.env.PUBLIC_TCHIN_KEY!,
    "TCHIN-PRIVATE-KEY": process.env.PRIVATE_TCHIN_KEY!,
  };
}

export type TchinEnv = "test" | "live";

// ── Encaissement (collection) ─────────────────────────────────────────────────
// Creates a payment request. Returns a payment_url to redirect the user to.
export interface TchinPaymentPayload {
  amount: number;           // integer FCFA
  description?: string;
  phone?: string;           // pre-fill the payment page
  operator?: "flooz" | "tmoney";
  webhook_url?: string;     // where Tchin POSTs confirmation
  redirect_url?: string;    // where to redirect after payment
  metadata?: Record<string, string>;
}

export interface TchinPaymentResponse {
  success: boolean;
  token: string;            // idempotence key — store it
  payment_url: string;      // redirect user here
  env: "sandbox" | "live";
}

export async function createPayment(
  payload: TchinPaymentPayload
): Promise<TchinPaymentResponse> {
  const env = (process.env.TCHIN_ENV ?? "test") as TchinEnv;

  const res = await fetch(`${TCHIN_BASE}/payments`, {
    method: "POST",
    headers: tchinHeaders(),
    body: JSON.stringify({ ...payload, env }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message ?? "Tchin: payment creation failed");
  }

  return data as TchinPaymentResponse;
}

// ── Webhook payload types ─────────────────────────────────────────────────────
// Tchin POSTs this to your webhook_url when the payment is completed/failed.
export interface TchinWebhookPayload {
  token: string;            // same token as in createPayment response
  status: "completed" | "failed" | "pending";
  mode: "test" | "live";
  amount: number;
  currency: string;
  phone?: string;
  operator?: string;
  metadata?: Record<string, string>;
  // signature fields (for HMAC verification when Tchin publishes the spec)
  signature?: string;
}

// Verify that a webhook came from Tchin.
//
// ⚠️  SECURITY NOTE — two-layer defence:
//   Layer 1 (current): env-mode check — rejects cross-environment replays
//     (test webhook hitting a live server and vice-versa).
//   Layer 2 (TODO): HMAC-SHA256 signature — Tchin does not yet publish a
//     shared-secret spec. When they do, add it here:
//       const sig = request.headers.get("X-Tchin-Signature");
//       const expected = crypto.createHmac("sha256", process.env.TCHIN_WEBHOOK_SECRET!)
//         .update(rawBody).digest("hex");
//       if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
//
// The database check (token exists in PendingPayment) is the final line of
// defence and is handled in the webhook route itself.
export function isWebhookLegit(payload: TchinWebhookPayload): boolean {
  const expectedMode = process.env.TCHIN_ENV === "live" ? "live" : "test";
  // Reject test webhooks hitting a live env and vice-versa
  if (payload.mode !== expectedMode) return false;
  return true;
}
