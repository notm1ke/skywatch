"use server";

import { Prisma } from "~/prisma/generated/client";
import { prisma } from "./prisma";
import { okAsync } from "./actions";

export type AirportWithJoins = Prisma.AirportGetPayload<{
	include: {
		runways: true,
		frequencies: true,
		navaids: true,
		airline_hubs: true,
	};
}>;

export const fetchAirports = async () => okAsync(
	prisma.airport.findMany({
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

export const fetchAirportByIata = async (iata_code: string) => okAsync(
	prisma.airport.findFirst({
		where: {
			iata_code,
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
		}
	})
)