import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import {
  listCampaignsSchema,
  createCampaignSchema,
  updateCampaignSchema,
  deleteCampaignSchema,
} from "@/server/contracts/campaigns";
import {
  listCampaignsWithStats,
  updateCampaign,
  deleteCampaign,
  getCampaignById,
  getCampaignStats,
} from "@/server/integrations/db/campaigns-repo";
import { createCampaign } from "@/server/services/CampaignService";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaigns - Listar campañas
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);

  // Si hay un id, devolver esa campaña con stats
  const id = searchParams.get("id");
  if (id) {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaña no encontrada" },
        { status: 404 }
      );
    }
    const stats = await getCampaignStats(id);
    return NextResponse.json({ campaign, stats });
  }

  const filtersInput = {
    query: searchParams.get("query") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };

  const parsed = listCampaignsSchema.safeParse(filtersInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const campaigns = await listCampaignsWithStats(parsed.data);
    return NextResponse.json({ campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns - Crear campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const campaign = await createCampaign(parsed.data, auth.user.id);
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/campaigns - Actualizar campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const campaign = await updateCampaign(parsed.data);
    return NextResponse.json(campaign);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("solo se pueden")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/campaigns - Borrar campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const parsed = deleteCampaignSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ID inválido", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    await deleteCampaign(parsed.data.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
