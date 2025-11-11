import { defineConfig, env } from "prisma/config";

// annoying issue with new prisma - it doesn't load .envs automatically even with Bun (needs --bun flag, causes LSP to crash)
import "dotenv/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
	},
	engine: "classic",
	datasource: {
		url: env("DATABASE_URL"),
	},
});
