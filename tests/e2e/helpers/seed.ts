import { getSupabaseAdminClient } from "./supabase-admin";

type SeedContext = {
  operatorUserId: string;
  operatorEmail: string;
};

export async function seedBaseE2EData(context: SeedContext): Promise<void> {
  const client = getSupabaseAdminClient();

  // Perfil operador (idempotente).
  const { error: profileError } = await client.from("profiles").upsert(
    {
      user_id: context.operatorUserId,
      email: context.operatorEmail,
      display_name: "Operador E2E",
    },
    { onConflict: "user_id" }
  );

  if (profileError) {
    throw new Error(`Error creando profile seed E2E: ${profileError.message}`);
  }

  // Cuenta Google mock para flujos que esperan integración vinculada.
  const { data: googleAccount, error: googleError } = await client
    .from("google_accounts")
    .insert({
      user_id: context.operatorUserId,
      google_sub: "google-sub-e2e",
      email: context.operatorEmail,
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      scopes: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    })
    .select("id")
    .single();

  if (googleError || !googleAccount?.id) {
    throw new Error(`Error creando google_account seed E2E: ${googleError?.message ?? "sin id"}`);
  }

  // Cuenta de envío verificada para habilitar flujos de campañas.
  const { error: emailAccountError } = await client.from("email_accounts").insert({
    user_id: context.operatorUserId,
    provider: "google",
    label: "Gmail E2E",
    email: context.operatorEmail,
    google_account_id: googleAccount.id,
    verified: true,
    last_verified_at: new Date().toISOString(),
  });

  if (emailAccountError) {
    throw new Error(`Error creando email_account seed E2E: ${emailAccountError.message}`);
  }

  // Tags base.
  const { data: tags, error: tagsError } = await client
    .from("tags")
    .insert([
      { name: "[E2E] Tipo A", kind: "tipo" },
      { name: "[E2E] Rubro Tech", kind: "rubro" },
    ])
    .select("id, kind");

  if (tagsError || !tags || tags.length < 2) {
    throw new Error(`Error creando tags seed E2E: ${tagsError?.message ?? "incompleto"}`);
  }

  const tipoTag = tags.find((t) => t.kind === "tipo");
  const rubroTag = tags.find((t) => t.kind === "rubro");

  // Contactos base.
  const { data: contacts, error: contactsError } = await client
    .from("contacts")
    .insert([
      {
        email: "matias.e2e@example.com",
        first_name: "Matias",
        last_name: "E2E",
        company: "FAROandes",
        position: "Operador",
        subscription_status: "active",
        suppression_status: "none",
      },
      {
        email: "ana.tech@example.com",
        first_name: "Ana",
        last_name: "Tech",
        company: "Acme Tech",
        position: "Marketing",
        subscription_status: "active",
        suppression_status: "none",
      },
      {
        email: "jorge.unsub@example.com",
        first_name: "Jorge",
        last_name: "Unsub",
        company: "Acme Tech",
        position: "Sales",
        subscription_status: "unsubscribed",
        suppression_status: "none",
      },
    ])
    .select("id, email")
    .order("email");

  if (contactsError || !contacts || contacts.length < 3) {
    throw new Error(`Error creando contactos seed E2E: ${contactsError?.message ?? "incompleto"}`);
  }

  // Relación de tags sobre contacto activo principal.
  const mainContact = contacts.find((c) => c.email === "matias.e2e@example.com");
  if (mainContact && tipoTag && rubroTag) {
    const { error: contactTagsError } = await client.from("contact_tags").insert([
      { contact_id: mainContact.id, tag_id: tipoTag.id },
      { contact_id: mainContact.id, tag_id: rubroTag.id },
    ]);

    if (contactTagsError) {
      throw new Error(`Error creando contact_tags seed E2E: ${contactTagsError.message}`);
    }
  }

  // Plantilla base.
  const { error: templateError } = await client.from("templates").insert({
    name: "[E2E] Plantilla Base",
    subject_tpl: "Hola {{FirstName}} - Campaña E2E",
    html_tpl:
      "<html><body><h1>Hola {{FirstName}}</h1><p>Empresa: {{Company}}</p><p><a href='{{UnsubscribeUrl}}'>Baja</a></p></body></html>",
    created_by: context.operatorUserId,
  });

  if (templateError) {
    throw new Error(`Error creando template seed E2E: ${templateError.message}`);
  }
}
