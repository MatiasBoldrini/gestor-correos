import { createServiceClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export type GoogleAccount = {
  id: string;
  userId: string;
  googleSub: string | null;
  email: string;
  accessToken: string | null;
  refreshToken: string;
  tokenExpiry: string | null;
  scopes: string[];
};

type DbGoogleAccount = {
  id: string;
  user_id: string;
  google_sub: string | null;
  email: string;
  access_token: string | null;
  refresh_token: string;
  token_expiry: string | null;
  scopes: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapear DB a respuesta
// ─────────────────────────────────────────────────────────────────────────────
function mapGoogleAccount(data: DbGoogleAccount): GoogleAccount {
  return {
    id: data.id,
    userId: data.user_id,
    googleSub: data.google_sub,
    email: data.email,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: data.token_expiry,
    scopes: data.scopes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener cuenta de Google por ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getGoogleAccountById(
  id: string
): Promise<GoogleAccount | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Error al obtener cuenta de Google: ${error.message}`);
  }

  return mapGoogleAccount(data as DbGoogleAccount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener cuenta de Google por user ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getGoogleAccountByUserId(
  userId: string
): Promise<GoogleAccount | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Error al obtener cuenta de Google: ${error.message}`);
  }

  return mapGoogleAccount(data as DbGoogleAccount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener la primera cuenta de Google disponible (single-tenant)
// ─────────────────────────────────────────────────────────────────────────────
export async function getFirstGoogleAccount(): Promise<GoogleAccount | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("google_accounts")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Error al obtener cuenta de Google: ${error.message}`);
  }

  return mapGoogleAccount(data as DbGoogleAccount);
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar tokens de una cuenta
// ─────────────────────────────────────────────────────────────────────────────
export async function updateGoogleAccountTokens(
  id: string,
  tokens: {
    accessToken: string;
    tokenExpiry?: string;
  }
): Promise<void> {
  const supabase = await createServiceClient();

  const updateData: Record<string, unknown> = {
    access_token: tokens.accessToken,
  };

  if (tokens.tokenExpiry) {
    updateData.token_expiry = tokens.tokenExpiry;
  }

  const { error } = await supabase
    .from("google_accounts")
    .update(updateData)
    .eq("id", id);

  if (error) {
    throw new Error(`Error al actualizar tokens: ${error.message}`);
  }
}
