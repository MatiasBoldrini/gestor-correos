import { createServiceClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export type SendWindow = {
  start: string; // "09:00"
  end: string; // "20:00"
};

export type SendWindows = {
  monday: SendWindow[];
  tuesday: SendWindow[];
  wednesday: SendWindow[];
  thursday: SendWindow[];
  friday: SendWindow[];
  saturday: SendWindow[];
  sunday: SendWindow[];
};

export type Settings = {
  id: number;
  timezone: string;
  dailyQuota: number;
  minDelaySeconds: number;
  sendWindows: SendWindows;
  signatureDefaultHtml: string | null;
  allowlistEmails: string[];
  allowlistDomains: string[];
};

type DbSettings = {
  id: number;
  timezone: string;
  daily_quota: number;
  min_delay_seconds: number;
  send_windows: SendWindows;
  signature_default_html: string | null;
  allowlist_emails: string[] | null;
  allowlist_domains: string[] | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapear DB a respuesta
// ─────────────────────────────────────────────────────────────────────────────
function mapSettings(data: DbSettings): Settings {
  return {
    id: data.id,
    timezone: data.timezone,
    dailyQuota: data.daily_quota,
    minDelaySeconds: data.min_delay_seconds,
    sendWindows: data.send_windows,
    signatureDefaultHtml: data.signature_default_html,
    allowlistEmails: data.allowlist_emails ?? [],
    allowlistDomains: data.allowlist_domains ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener configuración global (singleton, id=1)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSettings(): Promise<Settings> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(`Error al obtener configuración: ${error.message}`);
  }

  return mapSettings(data as DbSettings);
}
