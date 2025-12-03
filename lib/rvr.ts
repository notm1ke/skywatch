"use server";

import { redis } from "./redis";
import { prisma } from "./prisma";
import { safeParseJson } from "./utils";
import { ok, okAsync, raise } from "./actions";

export type RvrRunwayProbeValue = {
	/**
	 * -1 = Fault, 0-6000 ft, 6001 = Maxxed out
	 */
	visibilityFt: number;
	trend: "increasing" | "decreasing" | "steady";
}

export type RvrProbe = {
	name: string;
	touchdown?: RvrRunwayProbeValue;
	midpoint?: RvrRunwayProbeValue;
	rollout?: RvrRunwayProbeValue;
	illumination: {
		/**
	 * -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighting
	 */
		edge?: number;
		/**
	 * -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighting
	 */
		center?: number;
	}
}

export type RvrProbeType =
	| "touchdown"
	| "midpoint"
	| "rollout"

export type RvrResponse = {
	iata: string;
	updatedAt: number;
	runways: Array<RvrProbe>;
}

export const fetchRvrForAirport = async (iata_code: string) => {
	const airport = await prisma.airport.findFirst({
		where: { iata_code }
	});
	
	if (!airport) return raise("Airport not found");
	if (!airport?.supports_rvr) return ok({
		iata: airport.iata_code!,
		updatedAt: Date.now(),
		runways: []
	});
	
	return okAsync(
		redis.get(`airport:${airport.iata_code!}:rvr`)
			.then(raw => {
				if (!raw) throw new Error("Upstream error while retrieving RVR information")
				return safeParseJson<RvrResponse>(raw);
			}),
		err => err.message ?? "Unknown error"
	);
}
