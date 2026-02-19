import { describe, expect, it } from "vitest";
import { applyProfessionalEmailBaseStyles } from "@/server/domain/email-html";

describe("email-html domain", () => {
  describe("applyProfessionalEmailBaseStyles", () => {
    it("envuelve fragmentos sin body en html/body con estilos profesionales", () => {
      const input = "<p>Hola {{FirstName}}</p>";

      const result = applyProfessionalEmailBaseStyles(input);

      expect(result).toContain("<html><body");
      expect(result).toContain('data-email-base-style="professional-v1"');
      expect(result).toContain("font-family:Arial, Helvetica, sans-serif");
      expect(result).toContain("<p>Hola {{FirstName}}</p>");
      expect(result).toContain("</body></html>");
    });

    it("agrega marker y estilo al body existente", () => {
      const input = "<html><body><p>Contenido</p></body></html>";

      const result = applyProfessionalEmailBaseStyles(input);

      expect(result).toContain('<body style="');
      expect(result).toContain('data-email-base-style="professional-v1"');
      expect(result).toContain("font-size:15px");
      expect(result).toContain("<p>Contenido</p>");
    });

    it("preserva estilos previos del body", () => {
      const input =
        '<html><body style="background:#f8fafc; font-size:16px"><p>Contenido</p></body></html>';

      const result = applyProfessionalEmailBaseStyles(input);

      expect(result).toContain("background:#f8fafc");
      expect(result).toContain("font-size:16px");
      expect(result).toContain("font-family:Arial, Helvetica, sans-serif");
    });

    it("es idempotente cuando se aplica más de una vez", () => {
      const input = "<html><body><p>Contenido</p></body></html>";

      const firstPass = applyProfessionalEmailBaseStyles(input);
      const secondPass = applyProfessionalEmailBaseStyles(firstPass);

      expect(secondPass).toBe(firstPass);
      expect(secondPass.match(/data-email-base-style="professional-v1"/g)?.length).toBe(1);
    });
  });
});
