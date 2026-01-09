import { NextRequest, NextResponse } from "next/server";
import { verifyQStashSignature } from "@/server/integrations/qstash/verify";
import { sendTickPayloadSchema } from "@/server/contracts/campaigns";
import { processSendTick } from "@/server/services/CampaignService";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/jobs/send-tick - Procesar tick de envío (llamado por QStash)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Obtener body como texto para verificar firma
  const bodyText = await request.text();

  // Verificar firma de QStash
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    console.error("[send-tick] Missing QStash signature");
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 401 }
    );
  }

  const isValid = await verifyQStashSignature({
    signature,
    body: bodyText,
  });

  if (!isValid) {
    console.error("[send-tick] Invalid QStash signature");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    console.error("[send-tick] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validar payload
  const parsed = sendTickPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[send-tick] Invalid payload:", parsed.error.format());
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { campaignId, sendRunId } = parsed.data;

  // Procesar el tick
  try {
    const result = await processSendTick(campaignId, sendRunId);

    console.log(
      `[send-tick] Campaign ${campaignId}: ${result.action}`,
      result
    );

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error(`[send-tick] Error processing tick:`, message);

    // Retornar 200 para que QStash no reintente errores de lógica
    // Solo retornamos error para problemas transitorios
    return NextResponse.json({
      success: false,
      error: message,
    });
  }
}
