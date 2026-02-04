/**
 * Helpers para composición de firma HTML en emails.
 */

type AppendSignatureOptions = {
  /** HTML del cuerpo del email */
  html: string;
  /** HTML de la firma a insertar (puede ser null/undefined) */
  signatureHtml: string | null | undefined;
};

/**
 * Inserta la firma HTML al final del cuerpo del email.
 * Si el HTML tiene un cierre </body>, la firma se inserta justo antes.
 * Si no, se agrega al final.
 *
 * @returns HTML con la firma aplicada
 */
export function appendSignatureHtml({
  html,
  signatureHtml,
}: AppendSignatureOptions): string {
  // Si no hay firma, devolver el HTML sin cambios
  if (!signatureHtml || signatureHtml.trim() === "") {
    return html;
  }

  // Envolver la firma en un div para separación visual
  const signatureBlock = `\n<div style="margin-top:20px;">${signatureHtml}</div>`;

  // Buscar el cierre de </body> (case insensitive)
  const bodyCloseRegex = /<\/body>/i;
  const match = bodyCloseRegex.exec(html);

  if (match) {
    // Insertar antes de </body>
    const insertIndex = match.index;
    return (
      html.slice(0, insertIndex) + signatureBlock + html.slice(insertIndex)
    );
  }

  // Sin </body>, simplemente agregar al final
  return html + signatureBlock;
}

/**
 * Determina la firma efectiva a usar para un email.
 * Prioriza el override de campaña sobre la firma global.
 *
 * @param campaignOverride - Firma override de la campaña (puede ser null)
 * @param globalSignature - Firma global de settings (puede ser null)
 * @returns La firma a usar, o null si no hay ninguna
 */
export function resolveEffectiveSignature(
  campaignOverride: string | null | undefined,
  globalSignature: string | null | undefined
): string | null {
  // El override tiene prioridad
  if (campaignOverride && campaignOverride.trim() !== "") {
    return campaignOverride;
  }

  // Fallback a firma global
  if (globalSignature && globalSignature.trim() !== "") {
    return globalSignature;
  }

  return null;
}
