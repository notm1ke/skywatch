import axios from "axios";

import { z } from "zod/v4";
import { base, iataInput } from "@/utils";
import { ORPCError } from "@orpc/server";
import { cache } from "@/middleware/cache";
import { TsaWaitTimes } from "@/schemas/airport";

export const waitTimes = base
	.input(z.object({
		iata_code: z.string().min(3).max(3).toUpperCase()
	}))
	.use(cache<
		z.infer<typeof iataInput>,
		z.infer<typeof TsaWaitTimes>
	>(
		({ iata_code }) => `__airport:${iata_code}:tsa`,
		"30 minutes",
		TsaWaitTimes
	))
	.handler(async ({ input: { iata_code } }) => axios
		.get(`https://www.tsa.gov/api/checkpoint_waittime/v1/${iata_code}`)
		.then(res => res.data)
		.then(TsaWaitTimes.safeParse)
		.then(parsed => {
			if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR");
			return parsed.data;
		}));

export const tsa = { waitTimes }
