import axios from "axios";

import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { base, iataInput } from "~/utils";
import { cache } from "~/middleware/cache";
import { AirportMetar } from "~/schemas/airport";
import { injectAirportByIata } from "~/middleware/airport-by-iata";

export const weather = base
	.input(iataInput)
	.use(cache<
		z.infer<typeof iataInput>,
		z.infer<typeof AirportMetar>
	>(
		({ iata_code }) => `__airport:${iata_code}:metar`,
		"5 minutes",
		AirportMetar
	))
	.use(injectAirportByIata())
	.handler(async ({ context }) => axios
		.get(`https://aviationweather.gov/api/data/metar`, {
			params: {
				ids: context.airport.iata_code,
				format: "json",
				taf: true
			}
		})
		.then(res => res.data)
		.then(z.array(AirportMetar).safeParse)
		.then(parsed => {
			if (!parsed.success) throw new ORPCError("UPSTREAM_ERROR");
			return parsed.data.at(0);
		})
	);
