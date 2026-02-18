export function isExternalMocksEnabled(): boolean {
  return process.env.E2E_MOCK_EXTERNALS === "true";
}
