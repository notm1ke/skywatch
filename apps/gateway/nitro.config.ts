import { defineConfig } from "nitro";
import { fileURLToPath, URL } from "url";

export default defineConfig({
	serverDir: ".",
	routes: { "/**": "./src/index.ts" },
	alias: {
		"@/prisma": fileURLToPath(new URL("./prisma", import.meta.url)),
		"@": fileURLToPath(new URL("./src", import.meta.url)),
	},
	experimental: {
		tasks: true
	},
	scheduledTasks: {
		"*/5 * * * *": ["airport-status"],
		"*/30 * * * *": ["traffic"],
		// "0 * * * *": ["waypoints"]
	}
});
