import axios from "axios";

import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { base, iataInput } from "~/utils";
import { cache } from "~/middleware/cache";
import { AirportAtis } from "~/schemas/airport";
import { injectAirportByIata } from "~/middleware/airport-by-iata";

const AtisRawResponse = z.array(z.object({
	airport: z.string(),
	type: z.enum(["dep", "arr", "combined"]),
	datis: z.string(),
	time: z.string(),
	updatedAt: z.string()
}));

const atisRawType = {
	dep: "departure",
	arr: "arrival",
	combined: "combined"
};

const atisUnsupported: z.infer<typeof AirportAtis> = [
	{
		type: "combined",
		time: "0000",
		atis: "ATIS is not supported for this airport"
	}
]

export const atis = base
	.input(iataInput)
	.use(cache<
		z.infer<typeof iataInput>,
		z.infer<typeof AirportAtis>
	>(
		({ iata_code }) => `__airport:${iata_code}:atis`,
		"2 minutes",
		AirportAtis
	))
	.use(injectAirportByIata())
	.handler(async ({ context: { airport } }) => {
		if (!airport.supports_atis) return atisUnsupported;
		return axios
			.get(`https://atis.info/api/${airport.icao_code}`)
			.then(res => res.data)
			.then(AtisRawResponse.safeParse)
			.then(parsed => {
				if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR");
				return parsed.data.map(raw => ({
					type: atisRawType[raw.type],
					time: raw.time,
					atis: raw.datis
				}));
			})
	});