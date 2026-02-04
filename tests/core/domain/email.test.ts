import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  assertValidEmail,
  sanitizeHeaderValue,
} from "@/server/domain/email";

describe("email", () => {
  describe("normalizeEmail", () => {
    it("elimina espacios al inicio y final", () => {
      expect(normalizeEmail("  test@example.com  ")).toBe("test@example.com");
    });

    it("preserva mayúsculas/minúsculas", () => {
      expect(normalizeEmail("Test@Example.COM")).toBe("Test@Example.COM");
    });
  });

  describe("assertValidEmail", () => {
    it("acepta emails válidos", () => {
      expect(assertValidEmail("user@domain.com")).toBe("user@domain.com");
      expect(assertValidEmail("user.name@domain.co")).toBe("user.name@domain.co");
      expect(assertValidEmail("user+tag@domain.org")).toBe("user+tag@domain.org");
    });

    it("normaliza espacios antes de validar", () => {
      expect(assertValidEmail("  user@domain.com  ")).toBe("user@domain.com");
    });

    it("rechaza emails sin @", () => {
      expect(() => assertValidEmail("userdomain.com")).toThrow("inválido");
    });

    it("rechaza emails sin dominio", () => {
      expect(() => assertValidEmail("user@")).toThrow("inválido");
    });

    it("rechaza emails sin usuario", () => {
      expect(() => assertValidEmail("@domain.com")).toThrow("inválido");
    });

    it("rechaza emails con espacios en medio", () => {
      expect(() => assertValidEmail("user @domain.com")).toThrow("inválido");
    });

    it("usa label personalizado en el mensaje de error", () => {
      expect(() => assertValidEmail("invalid", "Email de destino")).toThrow(
        "Email de destino inválido"
      );
    });
  });

  describe("sanitizeHeaderValue", () => {
    it("elimina saltos de línea (prevención de header injection)", () => {
      expect(sanitizeHeaderValue("Line1\r\nLine2")).toBe("Line1 Line2");
      expect(sanitizeHeaderValue("Line1\nLine2")).toBe("Line1 Line2");
      expect(sanitizeHeaderValue("Line1\rLine2")).toBe("Line1 Line2");
    });

    it("elimina múltiples saltos de línea consecutivos", () => {
      expect(sanitizeHeaderValue("A\r\n\r\nB")).toBe("A B");
    });

    it("elimina espacios al inicio y final", () => {
      expect(sanitizeHeaderValue("  FAROandes  ")).toBe("FAROandes");
    });

    it("preserva texto normal sin modificar", () => {
      expect(sanitizeHeaderValue("FAROandes - Ciencia")).toBe("FAROandes - Ciencia");
    });

    it("maneja caracteres especiales seguros", () => {
      expect(sanitizeHeaderValue("Café & Más")).toBe("Café & Más");
      expect(sanitizeHeaderValue("Ñoño <3")).toBe("Ñoño <3");
    });
  });
});
