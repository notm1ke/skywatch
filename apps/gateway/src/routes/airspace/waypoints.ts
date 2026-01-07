import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";
import { WaypointGeoJson } from "@/schemas";

export const geojson = base
	.input(z.void())
	.handler(async () => ({
		type: "FeatureCollection",
		features: await prisma
			.waypoint
			.findMany()
			.then(rows => rows.map(row => ({
				type: "Feature",
				properties: {
					waypoint_id: row.waypoint_id,
					waypoint_use_code: row.waypoint_use_code,
					icao_region_code: row.icao_region_code,
					state_code: row.state_code,
					charts: row.charts,
					charting_remark: row.charting_remark,
					artcc_id_high: row.artcc_id_high,
					artcc_id_low: row.artcc_id_low,
					min_reception_alt: row.min_reception_alt,
					special_use_flag: row.special_use_flag,
					catch_flag: row.catch_flag,
					pitch_flag: row.pitch_flag,
					compulsory: row.compulsory
				},
				geometry: {
					type: "Point",
					coordinates: [row.longitude_deg, row.latitude_deg]
				}
			})))
	} as z.infer<typeof WaypointGeoJson>));

export const findById = base
	.input(z.object({ waypoint_id: z.string() }))
	.handler(async ({ input: { waypoint_id } }) => prisma
		.waypoint
		.findFirst({ where: { waypoint_id } })
		.then(async result => {
			if (!result) throw new ORPCError("NOT_FOUND");
			const marker = await prisma
				.airportTrafficFlow
				.findFirst({
					orderBy: [
						{ year: 'desc' },
						{ month: 'desc' },
						{ day: 'desc' }
					],
					select: {
						year: true,
						month: true,
						day: true
					}
				})
				.then(marker => {
					if (!marker || !marker.month || !marker.day) {
						return null;
					}

					return marker;
				})
				.catch(() => null);
			
			if (!marker) return {
				...result,
				airports: []
			}
			
			const airports = await prisma
				.airportTrafficFlow
				.findMany({
					distinct: ["iata_code"],
					select: { iata_code: true },
					where: {
						month: marker.month,
						day: marker.day,
						year: marker.year,
						fixes: { has: result.waypoint_id }
					}
				})
				.then(rows => rows.map(row => row.iata_code));
				
			return { ...result, airports }
		})
	);

export const search = base
	.input(z.object({ query: z.string() }))
	.handler(async ({ input: { query } }) => prisma
		.waypoint
		.findMany({
			where: {
				waypoint_id: {
					startsWith: query,
					mode: "insensitive"
				}
			},
			take: 100
		})
	);

export const waypoints = {
	geojson, findById, search
}