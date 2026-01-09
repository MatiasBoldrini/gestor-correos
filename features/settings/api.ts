import type { Settings, UpdateSettingsInput } from "./types";

export async function getSettings(): Promise<Settings> {
  const res = await fetch("/api/settings");
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Error al obtener configuración");
  }
  return res.json();
}

export async function updateSettings(input: UpdateSettingsInput): Promise<Settings> {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Error al actualizar configuración");
  }
  return res.json();
}
