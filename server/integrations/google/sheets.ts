import { google } from "googleapis";
import { getGoogleOAuthClient } from "@/server/integrations/google/oauth";
import { isExternalMocksEnabled } from "@/server/integrations/testing/mock-mode";
import { loadE2EFixture } from "@/server/integrations/testing/fixtures-loader";

export type SheetValues = string[][];

type MockSheetDataFixture = {
  defaultHeader: string[];
  defaultRows: SheetValues;
  bySpreadsheetId: Record<
    string,
    {
      header?: string[];
      rows?: SheetValues;
    }
  >;
};

async function getMockSheetData(
  spreadsheetId: string
): Promise<{ header: string[]; rows: SheetValues }> {
  const fixture = await loadE2EFixture<MockSheetDataFixture>("google/sheet-data.json");
  const byId = fixture.bySpreadsheetId[spreadsheetId];

  return {
    header: byId?.header ?? fixture.defaultHeader,
    rows: byId?.rows ?? fixture.defaultRows,
  };
}

function buildRange(sheetTab: string, startRow: number, endRow: number): string {
  const safeTab = sheetTab.replace(/'/g, "''");
  return `'${safeTab}'!A${startRow}:ZZ${endRow}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Leer headers (fila 1)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSheetHeader(options: {
  googleAccountId: string;
  spreadsheetId: string;
  sheetTab: string;
}): Promise<string[]> {
  if (isExternalMocksEnabled()) {
    const mock = await getMockSheetData(options.spreadsheetId);
    return mock.header;
  }

  const { googleAccountId, spreadsheetId, sheetTab } = options;
  const oauth2Client = await getGoogleOAuthClient(googleAccountId);
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: buildRange(sheetTab, 1, 1),
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  });

  const rows = (data.values ?? []) as SheetValues;
  return rows[0]?.map((cell) => String(cell)) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Leer filas por rango
// ─────────────────────────────────────────────────────────────────────────────
export async function getSheetRows(options: {
  googleAccountId: string;
  spreadsheetId: string;
  sheetTab: string;
  startRow: number;
  endRow: number;
}): Promise<SheetValues> {
  if (isExternalMocksEnabled()) {
    const mock = await getMockSheetData(options.spreadsheetId);
    const startIndex = Math.max(0, options.startRow - 2);
    const endIndexExclusive = Math.max(startIndex, options.endRow - 1);
    return mock.rows.slice(startIndex, endIndexExclusive);
  }

  const { googleAccountId, spreadsheetId, sheetTab, startRow, endRow } = options;
  const oauth2Client = await getGoogleOAuthClient(googleAccountId);
  const sheets = google.sheets({ version: "v4", auth: oauth2Client });

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: buildRange(sheetTab, startRow, endRow),
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
  });

  return (data.values ?? []) as SheetValues;
}
