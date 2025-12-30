import { z } from "zod/v4";
import { rvr } from "./rvr";
import { tsa } from "./tsa";
import { atis } from "./atis";
import { weather } from "./weather";
import { base, iataInput } from "@/utils";
import { prisma } from "@/services/prisma";
import { AirportGetPayload } from "@/prisma/generated/models";
import { injectAirportByIata } from "@/middleware/airport-by-iata";

const findAll = base
	.input(z.void())
	.handler(async () => prisma.airport.findMany({
		where: {
			icao_code: { not: "" },
			iata_code: { not: "" },
			scheduled_service: "yes",
			type: {
				notIn: ["seaplane_base", "closed", "heliport", "balloonport"],
			},
		},
		include: {
			runways: true,
			frequencies: true,
			navaids: true,
			airline_hubs: true,
		},
	})
);

type AirportWithJoins = AirportGetPayload<{
	include: {
		runways: true,
		frequencies: true,
		navaids: true,
		airline_hubs: true,
	}
}>;

const findByIata = base
	.input(iataInput)
	.use(injectAirportByIata<AirportWithJoins>(iata_code => ({
		where: {
			iata_code,
			scheduled_service: "yes",
			type: { notIn: ["seaplane_base", "closed", "heliport", "balloonport"] }
		},
		include: {
			airline_hubs: true,
			frequencies: true,
			navaids: true,
			runways: true
		}
	})))
	.handler(async ({ context: { airport } }) => airport);

export const airportRouter = {
	airports: {
		findAll, findByIata,
		atis, weather, rvr, tsa
	}
}
