import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { testSendSchema } from "@/server/contracts/campaigns";
import { sendTestSimulated } from "@/server/services/CampaignService";
import { listTestSendEvents } from "@/server/integrations/db/draft-items-repo";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/campaigns/[id]/test-send - Listar eventos de prueba
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { id: campaignId } = await params;

  try {
    const testSendEvents = await listTestSendEvents(campaignId);
    return NextResponse.json({ testSendEvents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/campaigns/[id]/test-send - Enviar prueba simulada
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

  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const event = await sendTestSimulated(campaignId, parsed.data.contactId);
    return NextResponse.json({
      success: true,
      event,
      message: `Prueba simulada enviada a ${event.toEmail}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("no encontrad") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
