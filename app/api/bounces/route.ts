import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { listBouncesSchema } from "@/server/contracts/bounces";
import { listBounceEvents } from "@/server/integrations/db/bounce-events-repo";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bounces - Listar bounce events con paginación
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);

  const filtersInput = {
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  };

  const parsed = listBouncesSchema.safeParse(filtersInput);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const { bounces, total } = await listBounceEvents(parsed.data);
    return NextResponse.json({
      bounces,
      total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
