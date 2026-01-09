import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type ApiUser = {
  id: string;
  email: string;
};

export type AuthResult =
  | { success: true; user: ApiUser }
  | { success: false; response: NextResponse };

/**
 * Helper para autenticación en Route Handlers.
 * Devuelve el usuario autenticado o una respuesta de error JSON (sin redirects).
 */
export async function requireApiAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      ),
    };
  }

  // Verificar allowlist
  const isAllowed = await checkAllowlistApi(user.email);
  if (!isAllowed) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

/**
 * Verifica si el email está en el allowlist.
 */
async function checkAllowlistApi(email: string): Promise<boolean> {
  const supabase = await createServiceClient();

  const { data: settings } = await supabase
    .from("settings")
    .select("allowlist_emails, allowlist_domains")
    .eq("id", 1)
    .single();

  if (!settings) {
    // Si no hay settings, permitir acceso (primera vez)
    return true;
  }

  const allowedEmails = settings.allowlist_emails as string[] | null;
  const allowedDomains = settings.allowlist_domains as string[] | null;

  // Si no hay allowlist configurado, permitir todos
  if (
    (!allowedEmails || allowedEmails.length === 0) &&
    (!allowedDomains || allowedDomains.length === 0)
  ) {
    return true;
  }

  // Verificar email exacto
  if (allowedEmails?.includes(email)) {
    return true;
  }

  // Verificar dominio
  const domain = email.split("@")[1];
  if (allowedDomains?.includes(domain)) {
    return true;
  }

  return false;
}
