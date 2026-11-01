import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * Vitest runs on its own config: the app config loads TanStack Start and
 * content-collections plugins, which are build-time only and break under
 * Vitest. Unit tests here cover pure logic (no DOM, no router, no MDX).
 */
export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}"],
	},
});
