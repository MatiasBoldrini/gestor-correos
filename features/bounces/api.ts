import type {
  BouncesListResponse,
  ScanBouncesResponse,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Listar bounce events
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchBounces(options?: {
  limit?: number;
  offset?: number;
}): Promise<BouncesListResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const url = `/api/bounces${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Error al cargar rebotes");
  }

  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Escanear rebotes en Gmail
// ─────────────────────────────────────────────────────────────────────────────
export async function scanBounces(options?: {
  maxResults?: number;
  newerThanDays?: number;
  trashProcessed?: boolean;
}): Promise<ScanBouncesResponse> {
  const res = await fetch("/api/bounces/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Error al escanear rebotes");
  }

  return res.json();
}
