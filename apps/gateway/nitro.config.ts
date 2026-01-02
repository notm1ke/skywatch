import { defineConfig } from "nitro";

export default defineConfig({
	serverDir: ".",
	routes: { "/**": "./src/index.ts" },
	experimental: {
		tasks: true
	},
	scheduledTasks: {
		"*/30 * * * *": ["traffic"]
	}
});
