import { createServiceClient } from "@/lib/supabase/server";
import type {
  CampaignResponse,
  CampaignStatsResponse,
  CampaignStatus,
  CampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
  ListCampaignsFilters,
} from "@/server/contracts/campaigns";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos internos (DB)
// ─────────────────────────────────────────────────────────────────────────────
type DbCampaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  template_id: string | null;
  filters_snapshot: CampaignFilters;
  from_alias: string | null;
  signature_html_override: string | null;
  created_by: string | null;
  active_lock: boolean;
  created_at: string;
  updated_at: string;
};

type DbCampaignWithTemplate = DbCampaign & {
  templates: { name: string } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mapear DB a respuesta
// ─────────────────────────────────────────────────────────────────────────────
function mapCampaign(
  campaign: DbCampaign,
  templateName: string | null = null
): CampaignResponse {
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    templateId: campaign.template_id,
    templateName,
    filtersSnapshot: campaign.filters_snapshot ?? {},
    fromAlias: campaign.from_alias,
    signatureHtmlOverride: campaign.signature_html_override,
    createdBy: campaign.created_by,
    activeLock: campaign.active_lock,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Listar campañas
// ─────────────────────────────────────────────────────────────────────────────
export async function listCampaigns(
  filters?: ListCampaignsFilters
): Promise<CampaignResponse[]> {
  const supabase = await createServiceClient();

  let query = supabase
    .from("campaigns")
    .select("*, templates(name)")
    .order("created_at", { ascending: false });

  if (filters?.query) {
    query = query.ilike("name", `%${filters.query}%`);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al listar campañas: ${error.message}`);
  }

  return (data as DbCampaignWithTemplate[]).map((c) =>
    mapCampaign(c, c.templates?.name ?? null)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener campaña por ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getCampaignById(
  id: string
): Promise<CampaignResponse | null> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, templates(name)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Error al obtener campaña: ${error.message}`);
  }

  const campaign = data as DbCampaignWithTemplate;
  return mapCampaign(campaign, campaign.templates?.name ?? null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function createCampaign(
  input: CreateCampaignInput,
  createdByUserId?: string
): Promise<CampaignResponse> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: input.name,
      template_id: input.templateId,
      filters_snapshot: input.filters ?? {},
      from_alias: input.fromAlias ?? null,
      signature_html_override: input.signatureHtmlOverride ?? null,
      created_by: createdByUserId ?? null,
      status: "draft",
      active_lock: false,
    })
    .select("*, templates(name)")
    .single();

  if (error) {
    throw new Error(`Error al crear campaña: ${error.message}`);
  }

  const campaign = data as DbCampaignWithTemplate;
  return mapCampaign(campaign, campaign.templates?.name ?? null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar campaña (solo si está en draft)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCampaign(
  input: UpdateCampaignInput
): Promise<CampaignResponse> {
  const supabase = await createServiceClient();

  // Verificar que la campaña está en draft
  const existing = await getCampaignById(input.id);
  if (!existing) {
    throw new Error("Campaña no encontrada");
  }
  if (existing.status !== "draft") {
    throw new Error("Solo se pueden editar campañas en estado borrador");
  }

  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.templateId !== undefined) updateData.template_id = input.templateId;
  if (input.filters !== undefined) updateData.filters_snapshot = input.filters;
  if (input.fromAlias !== undefined) updateData.from_alias = input.fromAlias;
  if (input.signatureHtmlOverride !== undefined) {
    updateData.signature_html_override = input.signatureHtmlOverride;
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", input.id)
    .select("*, templates(name)")
    .single();

  if (error) {
    throw new Error(`Error al actualizar campaña: ${error.message}`);
  }

  const campaign = data as DbCampaignWithTemplate;
  return mapCampaign(campaign, campaign.templates?.name ?? null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Actualizar estado de campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error(`Error al actualizar estado de campaña: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Borrar campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteCampaign(id: string): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("campaigns").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al borrar campaña: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener estadísticas de drafts de una campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function getCampaignStats(
  campaignId: string
): Promise<CampaignStatsResponse> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("draft_items")
    .select("state")
    .eq("campaign_id", campaignId);

  if (error) {
    throw new Error(`Error al obtener estadísticas: ${error.message}`);
  }

  const stats: CampaignStatsResponse = {
    totalDrafts: data?.length ?? 0,
    pending: 0,
    sent: 0,
    failed: 0,
    excluded: 0,
  };

  for (const item of data ?? []) {
    switch (item.state) {
      case "pending":
        stats.pending++;
        break;
      case "sent":
        stats.sent++;
        break;
      case "failed":
        stats.failed++;
        break;
      case "excluded":
        stats.excluded++;
        break;
    }
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar si existe otra campaña con lock activo
// ─────────────────────────────────────────────────────────────────────────────
export async function hasActiveCampaignLock(): Promise<boolean> {
  const supabase = await createServiceClient();

  const { count, error } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("active_lock", true);

  if (error) {
    throw new Error(`Error al verificar lock: ${error.message}`);
  }

  return (count ?? 0) > 0;
}
