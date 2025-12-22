"use server";

import axios from "axios";

import { redis } from "../redis";
import { prisma } from "../prisma";
import { safeParseJson } from "../utils";
import { ok, okAsync, raise } from "../actions";
import { Prisma } from "~/prisma/generated/client";

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

type AtisRawResponse = {
	airport: string; // ICAO
	type: "dep" | "arr" | "combined";
	datis: string;
	time: string; // 0654
	updatedAt: string; // date string
}

export type AtisType = "arrivals" | "departures" | "combined";

export type AtisResponse = {
	type: AtisType;
	time: string;
	atis: string;
}

const AtisResponseValidityPeriod = 60 * 2;

const atisRawType = {
	dep: "departures",
	arr: "arrivals",
	combined: "combined"
};

const atisUnsupported: AtisResponse = {
	type: "combined",
	time: "0000",
	atis: "ATIS is not supported for this airport"
}

export const fetchAtisForIata = async (iata_code: string) => {
	const airport = await prisma.airport.findFirst({
		where: { iata_code }
	});
	
	if (!airport) return raise("Airport not found");
	if (!airport.supports_atis) return ok([atisUnsupported]);
	
	return okAsync(
		redis.get(`airport:${airport.iata_code}:atis`)
			.then(raw => {
				const atis = safeParseJson<AtisResponse[]>(raw ?? undefined);
				if (atis) return atis;
				
				return axios
					.get<AtisRawResponse[]>(`https://atis.info/api/${airport.icao_code}`)
					.then(res => res.data)
					.then(data => {
						if (!data) throw new Error("Invalid response from upstream");
						const response = data.map(raw => ({
							type: atisRawType[raw.type],
							time: raw.time,
							atis: raw.datis
						})) as AtisResponse[]
						
						redis.set(
							`airport:${airport.iata_code}:atis`,
							JSON.stringify(response),
							'EX', AtisResponseValidityPeriod
						);
						
						return response;
					})
			})
	)
}
