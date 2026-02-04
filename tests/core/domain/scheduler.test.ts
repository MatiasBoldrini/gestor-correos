import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isWithinSendWindow,
  getSecondsRemainingInWindow,
  calculateNextTick,
  isQuotaExceeded,
} from "@/server/domain/scheduler";
import {
  createMockSettings,
  createAlwaysOpenSettings,
  createNoWindowsSettings,
} from "../../mocks/settings";

describe("scheduler", () => {
  beforeEach(() => {
    // Usamos fecha fija: miércoles 15 de enero 2025, 10:30:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T10:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isWithinSendWindow", () => {
    it("retorna true cuando estamos dentro de la ventana de envío", () => {
      // Miércoles 10:30 UTC, ventana 09:00-18:00
      const settings = createMockSettings({ timezone: "UTC" });
      expect(isWithinSendWindow(settings)).toBe(true);
    });

    it("retorna false cuando estamos fuera de la ventana de envío", () => {
      // Cambiar a 07:00 UTC (antes de la ventana 09:00-18:00)
      vi.setSystemTime(new Date("2025-01-15T07:00:00.000Z"));
      const settings = createMockSettings({ timezone: "UTC" });
      expect(isWithinSendWindow(settings)).toBe(false);
    });

    it("retorna false cuando no hay ventanas configuradas para el día", () => {
      // Sábado no tiene ventanas por defecto
      vi.setSystemTime(new Date("2025-01-18T10:30:00.000Z")); // Sábado
      const settings = createMockSettings({ timezone: "UTC" });
      expect(isWithinSendWindow(settings)).toBe(false);
    });

    it("retorna false cuando no hay ninguna ventana configurada", () => {
      const settings = createNoWindowsSettings({ timezone: "UTC" });
      expect(isWithinSendWindow(settings)).toBe(false);
    });

    it("funciona con ventanas 24/7", () => {
      const settings = createAlwaysOpenSettings({ timezone: "UTC" });
      expect(isWithinSendWindow(settings)).toBe(true);

      // También domingo a medianoche
      vi.setSystemTime(new Date("2025-01-19T00:01:00.000Z")); // Domingo
      expect(isWithinSendWindow(settings)).toBe(true);
    });
  });

  describe("getSecondsRemainingInWindow", () => {
    it("calcula correctamente los segundos restantes en la ventana", () => {
      // Miércoles 10:30:00 UTC, ventana termina a las 18:00
      // 18:00 - 10:30 = 7.5 horas = 27000 segundos
      const settings = createMockSettings({ timezone: "UTC" });
      const remaining = getSecondsRemainingInWindow(settings);
      expect(remaining).toBe(7.5 * 60 * 60);
    });

    it("retorna 0 cuando estamos fuera de ventana", () => {
      vi.setSystemTime(new Date("2025-01-15T07:00:00.000Z"));
      const settings = createMockSettings({ timezone: "UTC" });
      expect(getSecondsRemainingInWindow(settings)).toBe(0);
    });

    it("considera los segundos actuales en el cálculo", () => {
      // 10:30:30 UTC
      vi.setSystemTime(new Date("2025-01-15T10:30:30.000Z"));
      const settings = createMockSettings({ timezone: "UTC" });
      const remaining = getSecondsRemainingInWindow(settings);
      // 7.5 horas - 30 segundos = 26970 segundos
      expect(remaining).toBe(7.5 * 60 * 60 - 30);
    });
  });

  describe("isQuotaExceeded", () => {
    it("retorna false cuando no se alcanzó la cuota", () => {
      const settings = createMockSettings({ dailyQuota: 100 });
      expect(isQuotaExceeded(settings, 50)).toBe(false);
    });

    it("retorna true cuando se alcanzó exactamente la cuota", () => {
      const settings = createMockSettings({ dailyQuota: 100 });
      expect(isQuotaExceeded(settings, 100)).toBe(true);
    });

    it("retorna true cuando se excedió la cuota", () => {
      const settings = createMockSettings({ dailyQuota: 100 });
      expect(isQuotaExceeded(settings, 150)).toBe(true);
    });
  });

  describe("calculateNextTick", () => {
    it("retorna immediate con delay correcto cuando estamos en ventana y hay cuota", () => {
      const settings = createMockSettings({
        timezone: "UTC",
        dailyQuota: 100,
        minDelaySeconds: 30,
      });
      const result = calculateNextTick(settings, 10, 50);

      expect(result.type).toBe("immediate");
      if (result.type === "immediate") {
        // El delay debe ser al menos minDelaySeconds
        expect(result.delaySeconds).toBeGreaterThanOrEqual(30);
      }
    });

    it("respeta minDelaySeconds cuando el pacing ideal es menor", () => {
      const settings = createAlwaysOpenSettings({
        timezone: "UTC",
        dailyQuota: 1000,
        minDelaySeconds: 60,
      });
      // Pocos emails a enviar con mucho tiempo restante -> pacing ideal alto
      // Pero si el pacing ideal es menor que minDelaySeconds, usa minDelaySeconds
      const result = calculateNextTick(settings, 1, 0);

      expect(result.type).toBe("immediate");
      if (result.type === "immediate") {
        expect(result.delaySeconds).toBeGreaterThanOrEqual(60);
      }
    });

    it("retorna next_window cuando estamos fuera de ventana", () => {
      vi.setSystemTime(new Date("2025-01-15T07:00:00.000Z"));
      const settings = createMockSettings({ timezone: "UTC" });
      const result = calculateNextTick(settings, 10, 50);

      expect(result.type).toBe("next_window");
      if (result.type === "next_window") {
        expect(result.reason).toContain("Fuera de ventana");
        expect(result.notBefore).toBeInstanceOf(Date);
      }
    });

    it("retorna quota_exceeded cuando se agotó la cuota diaria", () => {
      const settings = createMockSettings({
        timezone: "UTC",
        dailyQuota: 100,
      });
      const result = calculateNextTick(settings, 10, 100);

      expect(result.type).toBe("quota_exceeded");
      if (result.type === "quota_exceeded") {
        expect(result.reason).toContain("Cuota diaria alcanzada");
        expect(result.notBefore).toBeInstanceOf(Date);
      }
    });

    it("calcula pacing basado en tiempo restante y emails pendientes", () => {
      // 10:30 UTC, ventana hasta 18:00 = 7.5h = 27000 segundos
      // 50 emails pendientes, cuota restante 50
      // Pacing ideal = 27000 / 50 = 540 segundos
      const settings = createMockSettings({
        timezone: "UTC",
        dailyQuota: 100,
        minDelaySeconds: 30,
      });
      const result = calculateNextTick(settings, 50, 50);

      expect(result.type).toBe("immediate");
      if (result.type === "immediate") {
        // El delay debería ser el pacing calculado (540) porque es > minDelaySeconds (30)
        expect(result.delaySeconds).toBe(540);
      }
    });

    it("usa minDelaySeconds cuando no hay emails pendientes", () => {
      const settings = createMockSettings({
        timezone: "UTC",
        dailyQuota: 100,
        minDelaySeconds: 45,
      });
      const result = calculateNextTick(settings, 0, 50);

      expect(result.type).toBe("immediate");
      if (result.type === "immediate") {
        expect(result.delaySeconds).toBe(45);
      }
    });
  });
});
