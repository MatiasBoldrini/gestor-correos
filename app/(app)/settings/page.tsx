import { getSettings } from "@/server/integrations/db/settings-repo";
import { SettingsPage } from "@/features/settings";

export default async function SettingsRoute() {
  const settings = await getSettings();

  return <SettingsPage initialSettings={settings} />;
}
