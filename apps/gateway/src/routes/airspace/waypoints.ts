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
			
			const charts = result.charts.filter(chart => chart !== "NOT REQUIRED");
			if (!marker) return {
				...result,
				charts,
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
				
			return { ...result, charts, airports }
		})
	);

export const search = base
	.input(z.object({ query: z.string() }))
	.handler(async ({ input: { query } }) => prisma
		.waypoint
		.findMany({
			where: {
				waypoint_id: {
					startsWith: query.toUpperCase()
				}
			},
			take: 100
		})
	);

type MapPoint = [id: string, use: string, lng: number, lat: number];

// The waypoint table only changes with a new FAA cycle (every 28 days), so one load serves for a long time.
const POINTS_TTL = 6 * 60 * 60 * 1000;
let pointsCache: { at: number; points: MapPoint[] } | null = null;

/**
 * Everything the map needs to draw every waypoint, and nothing else: [id, type, lng, lat] per point. `geojson` above
 * sends 13 properties per feature (~27MB for ~70k points); the map only ever reads these four, and the rest of a
 * waypoint loads on click (`findById`).
 */
export const points = base
	.input(z.void())
	.handler(async (): Promise<MapPoint[]> => {
		if (pointsCache && Date.now() - pointsCache.at < POINTS_TTL) return pointsCache.points;

		const rows = await prisma.waypoint.findMany({
			select: { waypoint_id: true, waypoint_use_code: true, longitude_deg: true, latitude_deg: true }
		});

		// 4 decimals is about 11 meters: finer than any zoom this map reaches can show
		const round = (value: number) => Math.round(value * 10_000) / 10_000;
		const result = rows.map((row): MapPoint => [
			row.waypoint_id,
			row.waypoint_use_code,
			round(row.longitude_deg),
			round(row.latitude_deg)
		]);

		pointsCache = { at: Date.now(), points: result };
		return result;
	});

type AirwayLine = {
	id: string;
	/** an airway id can exist in more than one place (contiguous US, Alaska, Hawaii) */
	location: string;
	/** the airway's own points in order, with the ones we couldn't place left out */
	points: Array<{ id: string; lat: number; lon: number }>;
};

type Usage = {
	airways: AirwayLine[];
	routes: {
		/** preferred routes that go through this fix */
		total: number;
		/** where the most of them go between */
		pairs: Array<{ origin: string; dest: string; count: number }>;
	};
};

// waypoint ids are letters and digits: checking keeps anything else out of the route pattern below
const WAYPOINT_ID = /^[A-Z0-9]{2,8}$/;

/** What a waypoint is part of: the airways that run through it, and the preferred routes that use it. */
export const usage = base
	.input(z.object({ waypoint_id: z.string() }))
	.handler(async ({ input }): Promise<Usage> => {
		const id = input.waypoint_id.toUpperCase();
		if (!WAYPOINT_ID.test(id)) return { airways: [], routes: { total: 0, pairs: [] } };

		// a route string is space separated, so the fix is a whole token: "ABR" in "... GEP ABR J32 ...", not in "ABRAM"
		const pattern = `(^| )${id}( |$)`;

		const [airwayRows, total, pairs] = await Promise.all([
			prisma.airway.findMany({
				where: { points: { has: id } },
				select: { airway_id: true, location: true, points: true }
			}),
			prisma.$queryRaw<Array<{ count: number }>>`
				select count(*)::int as count
				from preferred_routes
				where route_string ~ ${pattern}
			`,
			prisma.$queryRaw<Usage["routes"]["pairs"]>`
				select origin_iata as origin, dest_iata as dest, count(*)::int as count
				from preferred_routes
				where route_string ~ ${pattern}
				group by origin_iata, dest_iata
				order by count desc, origin_iata, dest_iata
				limit 6
			`
		]);

		// place every point along those airways: waypoints first, navaids for the ones that aren't (VORs and the like)
		const idents = [...new Set(airwayRows.flatMap(row => row.points))];
		const [waypointRows, navaidRows] = idents.length
			? await Promise.all([
				prisma.waypoint.findMany({
					where: { waypoint_id: { in: idents } },
					select: { waypoint_id: true, latitude_deg: true, longitude_deg: true }
				}),
				prisma.airportNav.findMany({
					where: { ident: { in: idents }, latitude_deg: { not: null }, longitude_deg: { not: null } },
					select: { ident: true, latitude_deg: true, longitude_deg: true }
				})
			])
			: [[], []];

		const placed = new Map<string, { lat: number; lon: number }>();
		for (const navaid of navaidRows) {
			if (navaid.latitude_deg == null || navaid.longitude_deg == null || placed.has(navaid.ident)) continue;
			placed.set(navaid.ident, { lat: navaid.latitude_deg, lon: navaid.longitude_deg });
		}

		for (const waypoint of waypointRows) {
			placed.set(waypoint.waypoint_id, { lat: waypoint.latitude_deg, lon: waypoint.longitude_deg });
		}

		const airways = airwayRows
			.map((row): AirwayLine => ({
				id: row.airway_id,
				location: row.location,
				points: row.points.flatMap(point => {
					const at = placed.get(point);
					return at ? [{ id: point, ...at }] : [];
				})
			}))
			.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));

		return { airways, routes: { total: total[0]?.count ?? 0, pairs } };
	});

export const waypoints = {
	geojson, points, usage, findById, search
}