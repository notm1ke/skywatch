import { defineConfig } from "nitro";

export default defineConfig({
	serverDir: ".",
	routes: { "/**": "./src/index.ts" },
	experimental: {
		tasks: true
	},
	scheduledTasks: {
		"*/5 * * * *": ["airport-status"],
		"*/30 * * * *": ["traffic"],
		"0 * * * *": ["waypoints"]
	}
});
