import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { pauseCampaign, resumeCampaign } from "@/server/services/CampaignService";
import { z } from "zod/v4";

const pauseSchema = z.object({
  action: z.enum(["pause", "resume"]).optional().default("pause"),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/[id]/pause - Pausar o reanudar campaña
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = pauseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "resume") {
      await resumeCampaign(campaignId);
      return NextResponse.json({
        success: true,
        message: "Campaña reanudada",
      });
    } else {
      await pauseCampaign(campaignId);
      return NextResponse.json({
        success: true,
        message: "Campaña pausada",
      });
    }
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
