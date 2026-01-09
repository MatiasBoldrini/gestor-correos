import type { Settings } from "@/server/integrations/db/settings-repo";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────────────────────────────────────
type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const DAY_NAMES: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// ─────────────────────────────────────────────────────────────────────────────
// Obtener fecha/hora actual en la timezone configurada
// ─────────────────────────────────────────────────────────────────────────────
function getNowInTimezone(timezone: string): Date {
  const now = new Date();
  const localString = now.toLocaleString("en-US", { timeZone: timezone });
  return new Date(localString);
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsear hora "HH:MM" a minutos desde medianoche
// ─────────────────────────────────────────────────────────────────────────────
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener minutos desde medianoche para una fecha
// ─────────────────────────────────────────────────────────────────────────────
function getMinutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar si estamos dentro de una ventana de envío
// ─────────────────────────────────────────────────────────────────────────────
export function isWithinSendWindow(settings: Settings): boolean {
  const now = getNowInTimezone(settings.timezone);
  const dayOfWeek = DAY_NAMES[now.getDay()];
  const windows = settings.sendWindows[dayOfWeek] ?? [];

  if (windows.length === 0) {
    return false;
  }

  const currentMinutes = getMinutesSinceMidnight(now);

  for (const window of windows) {
    const startMinutes = parseTimeToMinutes(window.start);
    const endMinutes = parseTimeToMinutes(window.end);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      return true;
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener segundos restantes en la ventana actual
// ─────────────────────────────────────────────────────────────────────────────
export function getSecondsRemainingInWindow(settings: Settings): number {
  const now = getNowInTimezone(settings.timezone);
  const dayOfWeek = DAY_NAMES[now.getDay()];
  const windows = settings.sendWindows[dayOfWeek] ?? [];

  const currentMinutes = getMinutesSinceMidnight(now);

  for (const window of windows) {
    const startMinutes = parseTimeToMinutes(window.start);
    const endMinutes = parseTimeToMinutes(window.end);

    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      const remainingMinutes = endMinutes - currentMinutes;
      const currentSeconds = now.getSeconds();
      return remainingMinutes * 60 - currentSeconds;
    }
  }

  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcular la próxima ventana de envío
// Retorna la fecha/hora (en UTC) del inicio de la próxima ventana
// ─────────────────────────────────────────────────────────────────────────────
export function getNextWindowStart(settings: Settings): Date {
  const now = getNowInTimezone(settings.timezone);
  const currentMinutes = getMinutesSinceMidnight(now);

  // Buscar en los próximos 7 días
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    const dayOfWeek = DAY_NAMES[checkDate.getDay()];
    const windows = settings.sendWindows[dayOfWeek] ?? [];

    for (const window of windows) {
      const startMinutes = parseTimeToMinutes(window.start);

      // Si es hoy, solo considerar ventanas futuras
      if (dayOffset === 0 && startMinutes <= currentMinutes) {
        continue;
      }

      // Construir fecha/hora del inicio de la ventana
      const windowStart = new Date(checkDate);
      windowStart.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      // Convertir de timezone local a UTC
      const utcString = windowStart.toLocaleString("en-US", {
        timeZone: settings.timezone,
      });
      const localDate = new Date(utcString);

      // Calcular diferencia para obtener UTC
      const diff = windowStart.getTime() - localDate.getTime();
      return new Date(windowStart.getTime() + diff);
    }
  }

  // No debería llegar aquí si hay al menos una ventana configurada
  throw new Error("No se encontró ninguna ventana de envío en los próximos 7 días");
}

// ─────────────────────────────────────────────────────────────────────────────
// Calcular delay para el próximo tick considerando ventanas y pacing
// ─────────────────────────────────────────────────────────────────────────────
export type NextTickResult =
  | { type: "immediate"; delaySeconds: number }
  | { type: "next_window"; notBefore: Date; reason: string }
  | { type: "quota_exceeded"; notBefore: Date; reason: string };

export function calculateNextTick(
  settings: Settings,
  pendingCount: number,
  todaySentCount: number
): NextTickResult {
  // Verificar cuota diaria
  if (todaySentCount >= settings.dailyQuota) {
    const nextWindow = getNextWindowStart(settings);
    // Si la próxima ventana es hoy, ir a mañana
    const now = getNowInTimezone(settings.timezone);
    const windowNow = getNowInTimezone(settings.timezone);
    windowNow.setTime(nextWindow.getTime());

    if (
      windowNow.getDate() === now.getDate() &&
      windowNow.getMonth() === now.getMonth()
    ) {
      // Ir al día siguiente
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return {
        type: "quota_exceeded",
        notBefore: tomorrow,
        reason: `Cuota diaria alcanzada (${settings.dailyQuota}). Continuará mañana.`,
      };
    }

    return {
      type: "quota_exceeded",
      notBefore: nextWindow,
      reason: `Cuota diaria alcanzada (${settings.dailyQuota}). Continuará en la próxima ventana.`,
    };
  }

  // Verificar si estamos dentro de ventana
  if (!isWithinSendWindow(settings)) {
    const nextWindow = getNextWindowStart(settings);
    return {
      type: "next_window",
      notBefore: nextWindow,
      reason: "Fuera de ventana de envío. Esperando próxima ventana.",
    };
  }

  // Estamos en ventana y hay cuota
  // Calcular delay con pacing inteligente
  const remainingSeconds = getSecondsRemainingInWindow(settings);
  const remainingQuota = settings.dailyQuota - todaySentCount;
  const toSend = Math.min(pendingCount, remainingQuota);

  // Pacing: distribuir los envíos en el tiempo restante
  // pero nunca menor que minDelaySeconds
  let delaySeconds: number;

  if (toSend > 0 && remainingSeconds > 0) {
    const idealDelay = Math.floor(remainingSeconds / toSend);
    delaySeconds = Math.max(settings.minDelaySeconds, idealDelay);
  } else {
    delaySeconds = settings.minDelaySeconds;
  }

  return {
    type: "immediate",
    delaySeconds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar si la cuota diaria está agotada
// ─────────────────────────────────────────────────────────────────────────────
export function isQuotaExceeded(
  settings: Settings,
  todaySentCount: number
): boolean {
  return todaySentCount >= settings.dailyQuota;
}
