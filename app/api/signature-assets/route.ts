import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/server/auth/api";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET_NAME = "signature-assets";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/signature-assets - Subir imagen de firma
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.success) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Se esperaba multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No se recibió archivo (campo 'file')" },
      { status: 400 }
    );
  }

  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: `Tipo de archivo no permitido. Permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `El archivo excede el tamaño máximo de 2 MB` },
      { status: 400 }
    );
  }

  // Generar nombre único
  const ext = file.name.split(".").pop() ?? "png";
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  const fileName = `signature_${timestamp}_${randomSuffix}.${ext}`;

  // Subir a Supabase Storage
  const supabase = await createServiceClient();

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[signature-assets] Upload error:", uploadError.message);
    return NextResponse.json(
      { error: `Error al subir archivo: ${uploadError.message}` },
      { status: 500 }
    );
  }

  // Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return NextResponse.json({
    success: true,
    publicUrl: publicUrlData.publicUrl,
    fileName,
  });
}
