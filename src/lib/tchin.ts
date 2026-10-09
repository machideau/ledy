// Tchin Mobile Money API wrapper
// Base URL: https://tchin.tech/api/v1
// Docs: https://doc.tchin.tech

import { createHmac, timingSafeEqual } from "crypto";

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
  amount: number;             // integer FCFA
  description?: string;
  env?: TchinEnv;
  return_url?: string;        // where to redirect the client after payment
  cancel_url?: string;        // where to redirect if the client cancels
  callback_url?: string;      // where Tchin POSTs confirmation webhook
  fees_on_customer?: boolean; // true = fees added on top and paid by client
}

export interface TchinPaymentResponse {
  success: boolean;
  token: string;              // idempotence key — store it
  payment_url: string;        // redirect user here
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

  const text = await res.text().catch(() => "");
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { /* not JSON */ }

  if (!res.ok || !data.success) {
    console.error("[tchin] createPayment failed", {
      httpStatus: res.status,
      body: text.slice(0, 500),
      pubKeyPresent: !!process.env.PUBLIC_TCHIN_KEY,
      privKeyPresent: !!process.env.PRIVATE_TCHIN_KEY,
      env,
    });
    const msg = (data.message as string) ?? (data.error as string) ?? `Tchin HTTP ${res.status}: ${text.slice(0, 200)}`;
    throw new Error(msg);
  }

  return data as unknown as TchinPaymentResponse;
}

// ── Webhook payload types ─────────────────────────────────────────────────────
// Tchin POSTs application/x-www-form-urlencoded to your callback_url.
// The payload is nested under the "data" key.
// See: https://doc.tchin.tech/webhooks
export interface TchinWebhookPayload {
  status: "completed" | "pending" | "failed" | "cancelled";
  reference: string;    // token of the payment link
  token: string;        // unique transaction id — your idempotence key
  amount: string;       // amount paid by the client (FCFA, as string)
  fee: string;          // Tchin fee (FCFA)
  net: string;          // amount credited to your balance (FCFA)
  country?: string;
  method?: string;
  kind?: string;        // "payout" for a disbursement; absent for collection
  mode: "test" | "live";
  timestamp: string;    // unix timestamp as string
  signature: string;    // HMAC-SHA256 of "timestamp.reference.token.status.amount.net.mode"
  hash?: string;        // legacy — do NOT use for authentication
  customer?: { name?: string; email?: string; phone?: string };
}

// Parse a raw application/x-www-form-urlencoded webhook body.
// Tchin wraps everything under a "data" key whose value is JSON.
export function parseTchinWebhook(rawBody: string): TchinWebhookPayload | null {
  try {
    const params = new URLSearchParams(rawBody);
    const dataStr = params.get("data");
    if (!dataStr) return null;
    return JSON.parse(dataStr) as TchinWebhookPayload;
  } catch {
    return null;
  }
}

// Verify the HMAC-SHA256 signature of a Tchin webhook.
//
// Signed string: timestamp.reference.token.status.amount.net.mode
// Algorithm:     HMAC-SHA256(signed_string, PRIVATE_TCHIN_KEY) → hex lowercase
//
// Additional checks:
//   - env-mode match: reject test webhooks on a live server and vice-versa.
//   - timestamp freshness: reject payloads older than 5 minutes.
export function isWebhookLegit(payload: TchinWebhookPayload): boolean {
  const expectedMode = process.env.TCHIN_ENV === "live" ? "live" : "test";

  // Reject cross-environment replays
  if (payload.mode !== expectedMode) return false;

  // Reject stale payloads (> 5 minutes)
  const ts = parseInt(payload.timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Verify HMAC-SHA256 signature
  const privateKey = process.env.PRIVATE_TCHIN_KEY!;
  const signedString = [
    payload.timestamp,
    payload.reference,
    payload.token,
    payload.status,
    payload.amount,
    payload.net,
    payload.mode,
  ].join(".");

  const expected = createHmac("sha256", privateKey)
    .update(signedString)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(payload.signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    // Buffer lengths differ if signature is malformed
    return false;
  }
}
