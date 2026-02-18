import { getSupabaseAdminClient } from "./supabase-admin";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function deleteById(table: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from(table).delete().neq("id", ZERO_UUID);
  if (error) {
    throw new Error(`Error reseteando tabla ${table}: ${error.message}`);
  }
}

async function deleteByColumnNotNull(table: string, column: string): Promise<void> {
  const client = getSupabaseAdminClient();
  const { error } = await client.from(table).delete().not(column, "is", null);
  if (error) {
    throw new Error(`Error reseteando tabla ${table}: ${error.message}`);
  }
}

export async function resetE2EDatabase(): Promise<void> {
  // Orden por dependencias FK (de hijos a padres).
  await deleteById("send_events");
  await deleteById("send_runs");
  await deleteById("test_send_events");
  await deleteById("draft_items");
  await deleteById("unsubscribe_events");
  await deleteById("bounce_events");
  await deleteById("campaigns");
  await deleteByColumnNotNull("contact_tags", "contact_id");
  await deleteByColumnNotNull("contact_source_memberships", "source_id");
  await deleteById("contact_sources");
  await deleteById("templates");
  await deleteById("tags");
  await deleteById("contacts");
  await deleteById("email_accounts");
  await deleteById("google_accounts");
  await deleteByColumnNotNull("profiles", "user_id");

  // Restaurar baseline de settings singleton.
  const client = getSupabaseAdminClient();
  const { error: settingsError } = await client.from("settings").upsert(
    {
      id: 1,
      timezone: "UTC",
      daily_quota: 100,
      min_delay_seconds: 1,
      send_windows: {
        monday: [{ start: "00:00", end: "23:59" }],
        tuesday: [{ start: "00:00", end: "23:59" }],
        wednesday: [{ start: "00:00", end: "23:59" }],
        thursday: [{ start: "00:00", end: "23:59" }],
        friday: [{ start: "00:00", end: "23:59" }],
        saturday: [{ start: "00:00", end: "23:59" }],
        sunday: [{ start: "00:00", end: "23:59" }],
      },
      signature_default_html: "<p>Saludos,<br/>Equipo E2E</p>",
      exclude_keywords: ["no-reply", "mailer-daemon"],
      allowlist_emails: [],
      allowlist_domains: [],
      active_contact_source_id: null,
    },
    { onConflict: "id" }
  );

  if (settingsError) {
    throw new Error(`Error restaurando settings para E2E: ${settingsError.message}`);
  }
}
