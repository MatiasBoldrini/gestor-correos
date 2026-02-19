const EMAIL_BASE_MARKER_ATTR = "data-email-base-style";
const EMAIL_BASE_MARKER_VALUE = "professional-v1";

const PROFESSIONAL_EMAIL_BASE_STYLE = [
  "margin:0",
  "padding:0",
  "font-family:Arial, Helvetica, sans-serif",
  "font-size:15px",
  "line-height:1.6",
  "color:#0f172a",
  "background-color:#ffffff",
  "-webkit-text-size-adjust:100%",
].join("; ");

/**
 * Aplica estilos tipográficos base para emails de forma idempotente.
 *
 * - Si el HTML ya fue procesado, lo deja intacto.
 * - Si existe <body>, agrega marker y estilos base respetando estilos previos.
 * - Si no existe <body>, envuelve el contenido con html/body estilizado.
 */
export function applyProfessionalEmailBaseStyles(html: string): string {
  if (html.includes(`${EMAIL_BASE_MARKER_ATTR}="${EMAIL_BASE_MARKER_VALUE}"`)) {
    return html;
  }

  const bodyOpenTagRegex = /<body\b[^>]*>/i;
  const bodyMatch = bodyOpenTagRegex.exec(html);

  if (!bodyMatch) {
    return `<html><body ${EMAIL_BASE_MARKER_ATTR}="${EMAIL_BASE_MARKER_VALUE}" style="${PROFESSIONAL_EMAIL_BASE_STYLE}">${html}</body></html>`;
  }

  const originalBodyTag = bodyMatch[0];
  const styleAttrRegex = /style\s*=\s*("([^"]*)"|'([^']*)')/i;
  const styleMatch = styleAttrRegex.exec(originalBodyTag);

  let updatedBodyTag = originalBodyTag;

  if (styleMatch) {
    const existingStyle = styleMatch[2] ?? styleMatch[3] ?? "";
    const combinedStyle = `${PROFESSIONAL_EMAIL_BASE_STYLE}; ${existingStyle}`.trim();
    updatedBodyTag = updatedBodyTag.replace(
      styleAttrRegex,
      `style="${combinedStyle}"`
    );
  } else {
    updatedBodyTag = updatedBodyTag.replace(
      /<body\b/i,
      `<body style="${PROFESSIONAL_EMAIL_BASE_STYLE}"`
    );
  }

  updatedBodyTag = updatedBodyTag.replace(
    />$/,
    ` ${EMAIL_BASE_MARKER_ATTR}="${EMAIL_BASE_MARKER_VALUE}">`
  );

  return html.replace(originalBodyTag, updatedBodyTag);
}
