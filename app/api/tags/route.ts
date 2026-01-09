import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import {
  listTagsSchema,
  createTagSchema,
  deleteTagSchema,
} from "@/server/contracts/tags";
import {
  listTags,
  createTag,
  deleteTag,
} from "@/server/integrations/db/tags-repo";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tags - Listar tags (opcionalmente filtrar por kind)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? undefined;

  const parsed = listTagsSchema.safeParse({ kind });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const tags = await listTags(parsed.data.kind);
    return NextResponse.json({ tags });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tags - Crear tag
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

  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const tag = await createTag(parsed.data.name, parsed.data.kind);
    return NextResponse.json(tag, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    const status = message.includes("ya existe") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tags - Borrar tag
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const parsed = deleteTagSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ID inválido", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    await deleteTag(parsed.data.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
