import { z } from "zod/v4";
import { base } from "@/utils";
import { injectDataMarker } from "@/middleware/traffic-marker";

export const topFlightRoutes = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		
	})