import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken, UnsubscribeError } from "@/server/services/UnsubscribeService";

type UnsubscribeBody = { token: string };

function toRedirectUrl(request: NextRequest, token: string, params: Record<string, string>) {
  const url = new URL(`/u/${encodeURIComponent(token)}`, request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

function toSafeErrorRedirect(request: NextRequest) {
  // Cuando el token viene vacío/ausente no tenemos a dónde volver.
  return new URL("/u/invalid?error=invalid_token", request.url);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  let body: UnsubscribeBody | null = null;
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as UnsubscribeBody;
    } else {
      const form = await request.formData();
      const token = form.get("token");
      body = { token: typeof token === "string" ? token : "" };
    }
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.redirect(toSafeErrorRedirect(request));
  }

  try {
    await unsubscribeByToken(token);
    return NextResponse.redirect(toRedirectUrl(request, token, { success: "true" }));
  } catch (err) {
    if (err instanceof UnsubscribeError) {
      const errorParam =
        err.code === "expired_token" ? "expired_token" : "invalid_token";
      return NextResponse.redirect(toRedirectUrl(request, token, { error: errorParam }));
    }

    // Si falla la DB, preferimos no revelar nada y dar un error genérico.
    return NextResponse.redirect(toRedirectUrl(request, token, { error: "server_error" }));
  }
}

