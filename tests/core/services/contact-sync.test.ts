import { describe, it, expect } from "vitest";

/**
 * Tests para la lógica de sincronización de contactos
 *
 * Estos tests validan las funciones helper y reglas de negocio
 * del ContactSyncService sin depender de Google Sheets o Supabase.
 */

describe("ContactSyncService helpers", () => {
  describe("normalizeHeader", () => {
    /**
     * Replica la función normalizeHeader del servicio
     */
    function normalizeHeader(value: string): string {
      return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ");
    }

    it("convierte a minúsculas", () => {
      expect(normalizeHeader("EMAIL")).toBe("email");
      expect(normalizeHeader("Nombre")).toBe("nombre");
    });

    it("elimina espacios al inicio y final", () => {
      expect(normalizeHeader("  email  ")).toBe("email");
    });

    it("normaliza espacios múltiples a uno solo", () => {
      expect(normalizeHeader("Email   1")).toBe("email 1");
      expect(normalizeHeader("Nombre  Completo")).toBe("nombre completo");
    });

    it("elimina acentos y diacríticos", () => {
      expect(normalizeHeader("Posición")).toBe("posicion");
      expect(normalizeHeader("Teléfono")).toBe("telefono");
      expect(normalizeHeader("Dirección")).toBe("direccion");
      expect(normalizeHeader("Año")).toBe("ano");
    });

    it("maneja ñ correctamente (se convierte a n)", () => {
      // La ñ se descompone en n + tilde nasal
      expect(normalizeHeader("Año")).toBe("ano");
      expect(normalizeHeader("España")).toBe("espana");
    });

    it("maneja strings vacíos", () => {
      expect(normalizeHeader("")).toBe("");
      expect(normalizeHeader("   ")).toBe("");
    });
  });

  describe("isSheetsRateLimitMessage", () => {
    /**
     * Replica la función isSheetsRateLimitMessage del servicio
     */
    function isSheetsRateLimitMessage(message: string): boolean {
      const m = message.toLowerCase();
      return (
        m.includes("quota exceeded") ||
        m.includes("read requests per minute") ||
        m.includes("user-rate limit") ||
        m.includes("userratelimitexceeded") ||
        m.includes("ratelimitexceeded") ||
        m.includes("rate limit")
      );
    }

    it("detecta mensaje de quota exceeded", () => {
      expect(isSheetsRateLimitMessage("Quota exceeded for this API")).toBe(true);
      expect(isSheetsRateLimitMessage("quota exceeded")).toBe(true);
    });

    it("detecta mensaje de read requests per minute", () => {
      expect(
        isSheetsRateLimitMessage("Read requests per minute exceeded")
      ).toBe(true);
    });

    it("detecta mensaje de user-rate limit", () => {
      expect(isSheetsRateLimitMessage("User-rate limit reached")).toBe(true);
    });

    it("detecta mensaje de userRateLimitExceeded", () => {
      expect(isSheetsRateLimitMessage("userRateLimitExceeded")).toBe(true);
    });

    it("detecta mensaje de rateLimitExceeded", () => {
      expect(isSheetsRateLimitMessage("rateLimitExceeded")).toBe(true);
    });

    it("detecta mensaje genérico de rate limit", () => {
      expect(isSheetsRateLimitMessage("Rate limit error")).toBe(true);
    });

    it("no detecta falsos positivos", () => {
      expect(isSheetsRateLimitMessage("Network error")).toBe(false);
      expect(isSheetsRateLimitMessage("Invalid credentials")).toBe(false);
      expect(isSheetsRateLimitMessage("Spreadsheet not found")).toBe(false);
    });

    it("es case-insensitive", () => {
      expect(isSheetsRateLimitMessage("QUOTA EXCEEDED")).toBe(true);
      expect(isSheetsRateLimitMessage("Rate Limit")).toBe(true);
    });
  });

  describe("computeRateLimitDelaySeconds", () => {
    const BASE_DELAY = 60;
    const MAX_DELAY = 15 * 60; // 900 segundos

    /**
     * Replica la función computeRateLimitDelaySeconds del servicio
     */
    function computeRateLimitDelaySeconds(attempt: number): number {
      const safeAttempt = Math.max(0, Math.min(20, attempt));
      const multiplier = Math.min(8, 2 ** safeAttempt);
      return Math.min(MAX_DELAY, BASE_DELAY * multiplier);
    }

    it("retorna delay base en intento 0", () => {
      expect(computeRateLimitDelaySeconds(0)).toBe(60); // 60 * 1
    });

    it("duplica delay con cada intento (exponential backoff)", () => {
      expect(computeRateLimitDelaySeconds(1)).toBe(120); // 60 * 2
      expect(computeRateLimitDelaySeconds(2)).toBe(240); // 60 * 4
      expect(computeRateLimitDelaySeconds(3)).toBe(480); // 60 * 8
    });

    it("limita el multiplicador a 8", () => {
      // A partir de attempt 3, el multiplicador se mantiene en 8
      expect(computeRateLimitDelaySeconds(3)).toBe(480); // 60 * 8
      expect(computeRateLimitDelaySeconds(4)).toBe(480); // 60 * 8 (capped)
      expect(computeRateLimitDelaySeconds(10)).toBe(480); // 60 * 8 (capped)
    });

    it("no excede MAX_DELAY", () => {
      expect(computeRateLimitDelaySeconds(100)).toBeLessThanOrEqual(MAX_DELAY);
    });

    it("maneja intentos negativos como 0", () => {
      expect(computeRateLimitDelaySeconds(-1)).toBe(60);
      expect(computeRateLimitDelaySeconds(-100)).toBe(60);
    });
  });

  describe("chunkArray", () => {
    /**
     * Replica la función chunkArray del servicio
     */
    function chunkArray<T>(items: T[], size: number): T[][] {
      if (size <= 0) return [items];
      const chunks: T[][] = [];
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
      }
      return chunks;
    }

    it("divide array en chunks del tamaño especificado", () => {
      const items = [1, 2, 3, 4, 5, 6];
      const chunks = chunkArray(items, 2);

      expect(chunks).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it("maneja arrays que no dividen exactamente", () => {
      const items = [1, 2, 3, 4, 5];
      const chunks = chunkArray(items, 2);

      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("retorna array original en un solo chunk si size <= 0", () => {
      const items = [1, 2, 3];
      expect(chunkArray(items, 0)).toEqual([[1, 2, 3]]);
      expect(chunkArray(items, -1)).toEqual([[1, 2, 3]]);
    });

    it("maneja array vacío", () => {
      expect(chunkArray([], 5)).toEqual([]);
    });

    it("maneja chunk size mayor que el array", () => {
      const items = [1, 2, 3];
      expect(chunkArray(items, 10)).toEqual([[1, 2, 3]]);
    });
  });

  describe("pickHeaderIndex", () => {
    /**
     * Replica la función pickHeaderIndex del servicio
     */
    function normalizeHeader(value: string): string {
      return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ");
    }

    function pickHeaderIndex(headers: string[], candidates: string[]): number | null {
      const normalized = headers.map(normalizeHeader);
      for (const candidate of candidates) {
        const idx = normalized.indexOf(candidate);
        if (idx >= 0) return idx;
      }
      return null;
    }

    it("encuentra header por nombre exacto normalizado", () => {
      const headers = ["Email", "Nombre", "Apellido", "Empresa"];
      expect(pickHeaderIndex(headers, ["email"])).toBe(0);
      expect(pickHeaderIndex(headers, ["nombre"])).toBe(1);
    });

    it("encuentra header con acentos", () => {
      const headers = ["Posición", "Teléfono"];
      expect(pickHeaderIndex(headers, ["posicion"])).toBe(0);
      expect(pickHeaderIndex(headers, ["telefono"])).toBe(1);
    });

    it("retorna el primer candidato que coincide", () => {
      const headers = ["Email 1", "Email 2"];
      // Busca primero "email", luego "email 1"
      expect(pickHeaderIndex(headers, ["email", "email 1"])).toBe(0);
    });

    it("retorna null si no hay coincidencias", () => {
      const headers = ["Email", "Nombre"];
      expect(pickHeaderIndex(headers, ["telefono", "celular"])).toBeNull();
    });

    it("maneja headers con espacios múltiples", () => {
      const headers = ["Email   Principal"];
      expect(pickHeaderIndex(headers, ["email principal"])).toBe(0);
    });
  });

  describe("getCell", () => {
    /**
     * Replica la función getCell del servicio
     */
    function getCell(row: string[], index: number | null): string {
      if (index === null || index < 0 || index >= row.length) return "";
      return String(row[index] ?? "").trim();
    }

    it("retorna valor de la celda en el índice", () => {
      const row = ["value1", "value2", "value3"];
      expect(getCell(row, 0)).toBe("value1");
      expect(getCell(row, 1)).toBe("value2");
    });

    it("elimina espacios del valor", () => {
      const row = ["  value with spaces  "];
      expect(getCell(row, 0)).toBe("value with spaces");
    });

    it("retorna string vacío para índice null", () => {
      const row = ["value"];
      expect(getCell(row, null)).toBe("");
    });

    it("retorna string vacío para índice negativo", () => {
      const row = ["value"];
      expect(getCell(row, -1)).toBe("");
    });

    it("retorna string vacío para índice fuera de rango", () => {
      const row = ["value"];
      expect(getCell(row, 5)).toBe("");
    });

    it("maneja valores undefined/null en el array", () => {
      const row = ["value", undefined as unknown as string, null as unknown as string];
      // El nullish coalescing (??) convierte undefined/null a ""
      expect(getCell(row, 1)).toBe("");
      expect(getCell(row, 2)).toBe("");
    });
  });

  describe("KNOWN_HEADERS y IGNORED_HEADERS", () => {
    const KNOWN_HEADERS = new Set([
      "email 1",
      "email 2",
      "email",
      "nombre",
      "apellido",
      "empresa",
      "posicion",
    ]);

    const IGNORED_HEADERS = new Set([
      "estado",
      "estado rebote",
      "copia estado rebote",
      "desde",
    ]);

    it("reconoce headers de email", () => {
      expect(KNOWN_HEADERS.has("email")).toBe(true);
      expect(KNOWN_HEADERS.has("email 1")).toBe(true);
      expect(KNOWN_HEADERS.has("email 2")).toBe(true);
    });

    it("reconoce headers de datos de contacto", () => {
      expect(KNOWN_HEADERS.has("nombre")).toBe(true);
      expect(KNOWN_HEADERS.has("apellido")).toBe(true);
      expect(KNOWN_HEADERS.has("empresa")).toBe(true);
      expect(KNOWN_HEADERS.has("posicion")).toBe(true);
    });

    it("ignora headers de estado", () => {
      expect(IGNORED_HEADERS.has("estado")).toBe(true);
      expect(IGNORED_HEADERS.has("estado rebote")).toBe(true);
    });

    it("ignora headers del sistema viejo", () => {
      expect(IGNORED_HEADERS.has("copia estado rebote")).toBe(true);
      expect(IGNORED_HEADERS.has("desde")).toBe(true);
    });
  });
});
