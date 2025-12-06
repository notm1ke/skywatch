"use server";

import axios from "axios";

import { redis } from "./redis";
import { prisma } from "./prisma";
import { safeParseJson } from "./utils";
import { okAsync, raise } from "./actions";

export type TsaWaitTimesResponse = {
	airport_code: string;
	airport_name: string;
	count: number;
	data: Array<{
		day: string;
		hour: string;
		max_standard_wait: string;
		updated: string;
	}>;
}

export const fetchWaitTimes = async (iata_code: string) => {
	const airport = await prisma.airport.findFirst({
		where: { iata_code }
	});
	
	if (!airport) return raise("Airport not found");
	return okAsync(
		redis.get(`airport:${airport.iata_code}:tsa`)
			.then(raw => {
				if (raw) return safeParseJson<TsaWaitTimesResponse>(raw);
				return axios
					.get<TsaWaitTimesResponse>(`https://www.tsa.gov/api/checkpoint_waittime/v1/${airport.iata_code}`)
					.then(res => res.data)
					.then(data => {
						redis.set(
							`airport:${airport.iata_code}:tsa`, JSON.stringify(data),
							"EX", 60 * 30
						);
						
						return data;
					})
			})
	);
}