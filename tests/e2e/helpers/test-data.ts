import { resetE2EDatabase } from "./db-reset";
import { getE2EOperatorCredentials } from "./env";
import { seedBaseE2EData } from "./seed";
import { ensureOperatorUser } from "./supabase-admin";

export async function resetAndSeedOperatorData(): Promise<void> {
  const { email } = getE2EOperatorCredentials();
  const operator = await ensureOperatorUser();

  await resetE2EDatabase();
  await seedBaseE2EData({
    operatorUserId: operator.id,
    operatorEmail: email,
  });
}

export function uniqueValue(prefix: string): string {
  const stamp = Date.now().toString(36);
  return `${prefix}-${stamp}`;
}
