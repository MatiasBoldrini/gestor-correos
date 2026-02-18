const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
  "E2E_OPERATOR_EMAIL",
  "E2E_OPERATOR_PASSWORD",
] as const;

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Falta variable de entorno requerida para E2E: ${key}`);
  }
  return value;
}

export function assertRequiredE2EEnv(): void {
  for (const key of REQUIRED_ENV_KEYS) {
    getRequiredEnv(key);
  }
}

export function getSupabaseE2EConfig() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    publishableKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  };
}

export function getE2EOperatorCredentials() {
  return {
    email: getRequiredEnv("E2E_OPERATOR_EMAIL"),
    password: getRequiredEnv("E2E_OPERATOR_PASSWORD"),
  };
}
