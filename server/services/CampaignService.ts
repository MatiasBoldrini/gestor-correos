import {
  getCampaignById,
  createCampaign as createCampaignRepo,
  updateCampaignStatus,
} from "@/server/integrations/db/campaigns-repo";
import {
  countDraftItems,
  deleteDraftItemsForCampaign,
  createDraftItemsBatch,
  findDraftItemByEmail,
  createDraftItem,
  excludeDraftItem as excludeDraftItemRepo,
  includeDraftItem as includeDraftItemRepo,
  createTestSendEvent,
} from "@/server/integrations/db/draft-items-repo";
import {
  listContactsForSnapshot,
  getContactById,
} from "@/server/integrations/db/contacts-repo";
import { getTemplateById } from "@/server/integrations/db/templates-repo";
import {
  renderHandlebarsTemplate,
  TemplatingError,
} from "@/server/domain/templating";
import type {
  CreateCampaignInput,
  CampaignResponse,
  DraftItemResponse,
  TestSendEventResponse,
  CampaignFilters,
} from "@/server/contracts/campaigns";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const UNSUBSCRIBE_URL_PLACEHOLDER = "{{UnsubscribeUrl}}";

// ─────────────────────────────────────────────────────────────────────────────
// Crear campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function createCampaign(
  input: CreateCampaignInput,
  userId?: string
): Promise<CampaignResponse> {
  // Verificar que el template existe
  const template = await getTemplateById(input.templateId);
  if (!template) {
    throw new Error("La plantilla seleccionada no existe");
  }

  return createCampaignRepo(input, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generar snapshot
// ─────────────────────────────────────────────────────────────────────────────
export type GenerateSnapshotResult = {
  created: number;
  capped: boolean;
};

export async function generateSnapshot(
  campaignId: string,
  options: { force?: boolean } = {}
): Promise<GenerateSnapshotResult> {
  // Obtener campaña
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error("Campaña no encontrada");
  }

  // Verificar estado
  if (campaign.status !== "draft" && campaign.status !== "ready") {
    throw new Error(
      "Solo se puede generar snapshot en campañas en borrador o listas"
    );
  }

  // Obtener template
  if (!campaign.templateId) {
    throw new Error("La campaña no tiene plantilla asignada");
  }

  const template = await getTemplateById(campaign.templateId);
  if (!template) {
    throw new Error("La plantilla de la campaña no existe");
  }

  // Verificar si ya hay drafts
  const existingCount = await countDraftItems(campaignId);
  if (existingCount > 0 && !options.force) {
    throw new Error(
      `Ya existen ${existingCount} drafts. Usa force=true para regenerar.`
    );
  }

  // Si force, eliminar los existentes
  if (existingCount > 0 && options.force) {
    await deleteDraftItemsForCampaign(campaignId);
  }

  // Obtener contactos del segmento
  const filters: CampaignFilters = campaign.filtersSnapshot ?? {};
  const { contacts, capped } = await listContactsForSnapshot({
    query: filters.query,
    company: filters.company,
    position: filters.position,
    tagIds: filters.tagIds,
  });

  if (contacts.length === 0) {
    throw new Error(
      "No hay contactos que coincidan con los filtros de la campaña"
    );
  }

  // Renderizar cada contacto
  const draftItems: Array<{
    campaignId: string;
    contactId: string | null;
    toEmail: string;
    renderedSubject: string;
    renderedHtml: string;
  }> = [];

  const errors: Array<{ email: string; error: string }> = [];

  for (const contact of contacts) {
    try {
      const result = renderHandlebarsTemplate(
        {
          subjectTpl: template.subjectTpl,
          htmlTpl: template.htmlTpl,
        },
        {
          FirstName: contact.firstName,
          LastName: contact.lastName,
          Company: contact.company,
          UnsubscribeUrl: UNSUBSCRIBE_URL_PLACEHOLDER,
        }
      );

      draftItems.push({
        campaignId,
        contactId: contact.id,
        toEmail: contact.email,
        renderedSubject: result.subject,
        renderedHtml: result.html,
      });
    } catch (err) {
      const message =
        err instanceof TemplatingError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Error desconocido";
      errors.push({ email: contact.email, error: message });
    }
  }

  // Insertar en batch
  const created = await createDraftItemsBatch(draftItems);

  // Actualizar estado de la campaña a ready
  await updateCampaignStatus(campaignId, "ready");

  // Si hubo errores, los logueamos pero no fallaremos
  if (errors.length > 0) {
    console.warn(
      `[CampaignService] ${errors.length} contactos con errores de render:`,
      errors.slice(0, 5)
    );
  }

  return { created, capped };
}

// ─────────────────────────────────────────────────────────────────────────────
// Incluir contacto manualmente
// ─────────────────────────────────────────────────────────────────────────────
export async function includeContactManually(
  campaignId: string,
  contactId: string
): Promise<DraftItemResponse> {
  // Obtener campaña
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error("Campaña no encontrada");
  }

  // Verificar estado
  if (campaign.status !== "draft" && campaign.status !== "ready") {
    throw new Error(
      "Solo se puede incluir contactos en campañas en borrador o listas"
    );
  }

  // Obtener template
  if (!campaign.templateId) {
    throw new Error("La campaña no tiene plantilla asignada");
  }

  const template = await getTemplateById(campaign.templateId);
  if (!template) {
    throw new Error("La plantilla de la campaña no existe");
  }

  // Obtener contacto
  const contact = await getContactById(contactId);
  if (!contact) {
    throw new Error("Contacto no encontrado");
  }

  // Verificar si ya existe un draft para este email
  const existing = await findDraftItemByEmail(campaignId, contact.email);
  if (existing) {
    // Si está excluido, rehabilitarlo
    if (existing.state === "excluded") {
      return includeDraftItemRepo(existing.id);
    }
    throw new Error("Este contacto ya tiene un draft en esta campaña");
  }

  // Renderizar
  const result = renderHandlebarsTemplate(
    {
      subjectTpl: template.subjectTpl,
      htmlTpl: template.htmlTpl,
    },
    {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Company: contact.company,
      UnsubscribeUrl: UNSUBSCRIBE_URL_PLACEHOLDER,
    }
  );

  // Crear draft item marcado como manual
  return createDraftItem({
    campaignId,
    contactId: contact.id,
    toEmail: contact.email,
    renderedSubject: result.subject,
    renderedHtml: result.html,
    includedManually: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Excluir draft item
// ─────────────────────────────────────────────────────────────────────────────
export async function excludeDraftItem(
  draftItemId: string
): Promise<DraftItemResponse> {
  return excludeDraftItemRepo(draftItemId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Incluir draft item (rehabilitar uno excluido)
// ─────────────────────────────────────────────────────────────────────────────
export async function includeDraftItem(
  draftItemId: string
): Promise<DraftItemResponse> {
  return includeDraftItemRepo(draftItemId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Enviar prueba simulada
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTestSimulated(
  campaignId: string,
  contactId: string
): Promise<TestSendEventResponse> {
  // Obtener campaña
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error("Campaña no encontrada");
  }

  // Obtener template
  if (!campaign.templateId) {
    throw new Error("La campaña no tiene plantilla asignada");
  }

  const template = await getTemplateById(campaign.templateId);
  if (!template) {
    throw new Error("La plantilla de la campaña no existe");
  }

  // Obtener contacto
  const contact = await getContactById(contactId);
  if (!contact) {
    throw new Error("Contacto no encontrado");
  }

  // Renderizar
  const result = renderHandlebarsTemplate(
    {
      subjectTpl: template.subjectTpl,
      htmlTpl: template.htmlTpl,
    },
    {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Company: contact.company,
      UnsubscribeUrl: "https://example.com/unsubscribe/TEST_TOKEN",
    }
  );

  // Crear evento de test
  return createTestSendEvent({
    campaignId,
    contactId: contact.id,
    toEmail: contact.email,
    renderedSubject: result.subject,
    renderedHtml: result.html,
  });
}
