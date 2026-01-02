import { z } from "zod/v4";
import { base } from "@/utils";

export const health = base
	.input(z.void())
	.handler(async () => ({
		status: "ok"
	}));