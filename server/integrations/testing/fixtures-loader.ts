import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, unknown>();

export async function loadE2EFixture<T>(relativeFixturePath: string): Promise<T> {
  const normalizedPath = relativeFixturePath.replace(/^\/+/, "");

  if (cache.has(normalizedPath)) {
    return cache.get(normalizedPath) as T;
  }

  const absolutePath = path.join(
    process.cwd(),
    "tests",
    "e2e",
    "fixtures",
    "external",
    normalizedPath
  );

  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw) as T;
  cache.set(normalizedPath, parsed);

  return parsed;
}
