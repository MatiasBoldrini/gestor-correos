import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { cancelCampaign } from "@/server/services/CampaignService";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/[id]/cancel - Cancelar campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;

  try {
    await cancelCampaign(campaignId);
    return NextResponse.json({
      success: true,
      message: "Campaña cancelada",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("Solo se pueden")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
