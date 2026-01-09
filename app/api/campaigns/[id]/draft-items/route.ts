import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import {
  listDraftItemsSchema,
  updateDraftItemSchema,
  includeContactManuallySchema,
} from "@/server/contracts/campaigns";
import { listDraftItems } from "@/server/integrations/db/draft-items-repo";
import {
  excludeDraftItem,
  includeDraftItem,
  includeContactManually,
} from "@/server/services/CampaignService";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaigns/[id]/draft-items - Listar draft items
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;
  const { searchParams } = new URL(request.url);

  const filtersInput = {
    query: searchParams.get("query") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  };

  const parsed = listDraftItemsSchema.safeParse(filtersInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const { draftItems, total } = await listDraftItems(campaignId, parsed.data);
    return NextResponse.json({
      draftItems,
      total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaigns/[id]/draft-items - Excluir/incluir draft item
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  // campaignId no se usa directamente, pero validamos contexto
  await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateDraftItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const draftItem =
      parsed.data.action === "exclude"
        ? await excludeDraftItem(parsed.data.id)
        : await includeDraftItem(parsed.data.id);
    return NextResponse.json(draftItem);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/[id]/draft-items - Incluir contacto manualmente
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = includeContactManuallySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const draftItem = await includeContactManually(
      campaignId,
      parsed.data.contactId
    );
    return NextResponse.json(draftItem, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrad")
      ? 404
      : message.includes("ya tiene")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
