import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getE2EOperatorCredentials, getSupabaseE2EConfig } from "./env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const { url, serviceRoleKey } = getSupabaseE2EConfig();

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

async function findUserByEmail(email: string): Promise<User | null> {
  const client = getSupabaseAdminClient();

  const { data, error } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });

  if (error) {
    throw new Error(`No se pudo listar usuarios auth para E2E: ${error.message}`);
  }

  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function ensureOperatorUser(): Promise<{ id: string; email: string }> {
  const client = getSupabaseAdminClient();
  const { email, password } = getE2EOperatorCredentials();

  const existing = await findUserByEmail(email);
  if (existing) {
    const { error: updateError } = await client.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Operador E2E",
      },
    });

    if (updateError) {
      throw new Error(`No se pudo actualizar usuario operador E2E: ${updateError.message}`);
    }

    const { error: profileError } = await client.from("profiles").upsert(
      {
        user_id: existing.id,
        email,
        display_name: "Operador E2E",
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      throw new Error(`No se pudo upsert profile E2E: ${profileError.message}`);
    }

    return { id: existing.id, email };
  }

  const { data: createdData, error: createError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: "Operador E2E",
    },
  });

  if (createError || !createdData.user) {
    throw new Error(`No se pudo crear usuario operador E2E: ${createError?.message ?? "sin user"}`);
  }

  const { error: profileError } = await client.from("profiles").insert({
    user_id: createdData.user.id,
    email,
    display_name: "Operador E2E",
  });

  if (profileError) {
    throw new Error(`No se pudo crear profile E2E: ${profileError.message}`);
  }

  return { id: createdData.user.id, email };
}
