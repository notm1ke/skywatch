"use server";

import axios from "axios";

import { redis } from "./redis";
import { prisma } from "./prisma";
import { safeParseJson } from "./utils";
import { okAsync, raise } from "./actions";

export type CloudCover = 
	| "SKC" // clear sky - manual stations
	| "CLR" // clear sky - automated stations
	| "FEW" // few clouds
	| "SCT" // scattered clouds
	| "BKN" // broken clouds
	| "OVC" // overcast
	| "VV"  // vertical visibility (completely obscured)
	
export type FlightCategory =
	| "VFR"  // visual flight rules
	| "MVFR" // marginal vfr
	| "IFR"  // instrument flight rules
	| "LIFR" // low ifr (severe restrictions)
	
export type MetarResponse = {
	icaoId: string;
	receiptTime: string;
	obsTime: string;
	reportTime: string;
	temp: number; // celsius
	dewp: number; // celsius
	wdir: number; // wind direction (deg)
	wspd: number; // wind speed (kts)
	wgst?: number; // wind gust (kts)
	visib: string | number; // "n+" or just n (statute mi)
	altim: number; // altimeter (hPa)
	slp: number; // sea level pressure (hPa)
	qcField: number; // 1-5, higher is better
	wxString?: string; // severe weather string (i.e. -FZRA PL)
	maxT?: number;
	minT?: number;
	maxT24?: number;
	minT24?: number;
	presTend?: number; // 3hr pressure tendency (change in altimeter)
	precip?: number; // precipitation (in)
	pcp3hr?: number; // precipitation 3 hour (in)
	pcp6hr?: number; // precipitation 6 hour (in)
	// pcp24hr?: number; // precipitation 24 hour (in)
	snow?: number;
	// vertVis?: number;
	metarType: string; // METAR or SPECI
	rawOb: string; // raw observation metar report
	lat: number; // station latitude
	lon: number; // station longitude
	elev: number; // elevation (ft)
	name: string; // station name
	cover: CloudCover; // cloud cover descriptor, i.e. BKN, SCT, OVC, CLR, FEW,
	clouds: Array<{
		cover: CloudCover; // cloud cover descriptor
		base: number; // base altitude (ft)
	}>;
	fltCat: FlightCategory; // flight category
	rawTaf: string; // raw terminal aerodrome forecast report
};

const WeatherReportValidityPeriod = 60 * 5;

export const fetchWeatherReport = async (iata_code: string) => {
	const airport = await prisma.airport.findFirst({
		where: { iata_code }
	});
	
	if (!airport) return raise("Airport not found");
	
	return okAsync(
		redis
			.get(`airport:${airport.iata_code}:metar`)
			.then(response => {
				const metar = safeParseJson<MetarResponse>(response ?? undefined);
				if (metar) return metar;
				return axios
					.get<MetarResponse[]>(
						'https://aviationweather.gov/api/data/metar',
						{
							params: {
								ids: airport.icao_code,
								format: "json",
								taf: true
							}
						}
					)
					.then(res => res.data)
					.then(data => {
						if (!data) throw new Error("Invalid response from upstream");
						
						redis.set(
							`airport:${airport.iata_code}:metar`,
							JSON.stringify(data.at(0)),
							'EX', WeatherReportValidityPeriod
						);
						
						return data.at(0)!;
					})
			}),
		err => err.message
	)
}