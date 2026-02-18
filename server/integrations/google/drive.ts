import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/server/integrations/google/oauth";
import { isExternalMocksEnabled } from "@/server/integrations/testing/mock-mode";
import { loadE2EFixture } from "@/server/integrations/testing/fixtures-loader";

export type SpreadsheetInfo = {
  id: string;
  name: string;
};

type ListOptions = {
  query?: string;
  pageSize?: number;
  maxItems?: number;
};

type MockSpreadsheetsFixture = {
  spreadsheets: SpreadsheetInfo[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Listar spreadsheets accesibles por la cuenta
// ─────────────────────────────────────────────────────────────────────────────
export async function listSpreadsheets(
  googleAccountId: string,
  options: ListOptions = {}
): Promise<SpreadsheetInfo[]> {
  if (isExternalMocksEnabled()) {
    const fixture = await loadE2EFixture<MockSpreadsheetsFixture>(
      "google/spreadsheets.json"
    );
    const query = options.query?.trim().toLowerCase();

    const filtered = query
      ? fixture.spreadsheets.filter((sheet) =>
          sheet.name.toLowerCase().includes(query)
        )
      : fixture.spreadsheets;

    const maxItems = options.maxItems ?? filtered.length;
    return filtered.slice(0, maxItems);
  }

  const oauth2Client = await getGoogleOAuthClient(googleAccountId);
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const pageSize = options.pageSize ?? 100;
  const maxItems = options.maxItems ?? 200;
  const query = options.query?.trim();

  const filters = [
    "mimeType='application/vnd.google-apps.spreadsheet'",
    "trashed=false",
  ];

  if (query) {
    filters.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  }

  const results: SpreadsheetInfo[] = [];
  let pageToken: string | undefined;

  while (results.length < maxItems) {
    const { data } = await drive.files.list({
      q: filters.join(" and "),
      pageSize: Math.min(pageSize, maxItems - results.length),
      pageToken,
      fields: "nextPageToken, files(id, name)",
    });

    const files = data.files ?? [];
    for (const file of files) {
      if (file.id && file.name) {
        results.push({ id: file.id, name: file.name });
      }
    }

    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken || files.length === 0) break;
  }

  return results;
}
