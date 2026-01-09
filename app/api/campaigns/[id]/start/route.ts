import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { startCampaign } from "@/server/services/CampaignService";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/[id]/start - Iniciar envío de campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;

  try {
    const sendRun = await startCampaign(campaignId);
    return NextResponse.json({
      success: true,
      sendRun,
      message: "Campaña iniciada. El envío comenzará en breve.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrada")
      ? 404
      : message.includes("Solo se pueden") ||
          message.includes("Ya hay otra") ||
          message.includes("No hay")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
