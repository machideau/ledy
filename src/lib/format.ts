// Shared formatting helpers for client and server.

// Format 8-digit phone "90123456" → "+228 90 12 34 56"
export function formatPhone(phone: string): string {
  if (phone.startsWith("+228")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) {
    return `+228 ${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  return phone;
}

// Format an ISO date string to "dd Mon yyyy" (French locale)
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}
