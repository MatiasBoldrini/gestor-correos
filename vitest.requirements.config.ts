import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    include: ["tests/requirements/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    // Los tests de requirements pueden fallar por diseño
    // (representan features faltantes vs documentación)
  },
});
