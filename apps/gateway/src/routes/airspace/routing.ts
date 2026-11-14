import { z } from "zod/v4";
import { base } from "@/utils";
import { cache } from "@/middleware/cache";
import { prisma } from "@/services/prisma";
import { Prisma } from "@/prisma/generated/client";
import { loadGazetteer, resolveRoute } from "@/services/route-resolver";

/**
 * One end of a search: a single airport (IATA) or a whole ARTCC.
 * Explicit keys instead of guessing from the code, so an airport and a center can never be confused.
 */
const Endpoint = z.union([
	z.object({ airport: z.string().length(3).toUpperCase() }),
	z.object({ artcc: z.string().length(3).toUpperCase() })
]);

type Endpoint = z.infer<typeof Endpoint>;

const DEFAULT_LIMIT = 500;
// the biggest real searches (an ARTCC to anywhere) are ~2.7k routes today
const MAX_LIMIT = 3000;

const SearchInput = z
	.object({
		from: Endpoint.optional(),
		to: Endpoint.optional(),
		/** Also return the opposite direction (to -> from). Preferred routes are directional, so A -> B and B -> A are different rows. */
		bidirectional: z.boolean().default(false),
		limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT)
	})
	.refine(input => input.from || input.to, { message: "Provide a from, a to, or both." });

const originFilter = (endpoint?: Endpoint): Prisma.PreferredRouteWhereInput => {
	if (!endpoint) return {};
	return "airport" in endpoint
		? { origin_iata: endpoint.airport }
		: { origin_artcc: endpoint.artcc };
};

const destFilter = (endpoint?: Endpoint): Prisma.PreferredRouteWhereInput => {
	if (!endpoint) return {};
	return "airport" in endpoint
		? { dest_iata: endpoint.airport }
		: { dest_artcc: endpoint.artcc };
};

/**
 * Every combination of airport / ARTCC on either side maps onto an index:
 * origin_iata (prefix of the unique key), dest_iata, (origin_artcc, dest_artcc), dest_artcc.
 */
const directional = (from?: Endpoint, to?: Endpoint): Prisma.PreferredRouteWhereInput => ({
	AND: [originFilter(from), destFilter(to)]
});

export const search = base
	.input(SearchInput)
	.handler(async ({ input: { from, to, bidirectional, limit } }) => {
		const where: Prisma.PreferredRouteWhereInput = bidirectional
			? { OR: [directional(from, to), directional(to, from)] }
			: directional(from, to);

		const [rows, total] = await Promise.all([
			prisma.preferredRoute.findMany({
				where,
				take: limit,
				orderBy: [
					{ origin_iata: "asc" },
					{ dest_iata: "asc" },
					{ route_type: "asc" },
					{ sequence: "asc" }
				]
			}),
			prisma.preferredRoute.count({ where })
		]);

		const gazetteer = await loadGazetteer(rows);

		return {
			/** matching routes before `limit` was applied */
			total,
			truncated: total > rows.length,
			routes: rows.map(row => ({
				id: row.route_id,
				/** FAA route type: H high altitude, L low altitude, TEC tower enroute, NAR, SHD, SLD, HPD */
				type: row.route_type,
				/** The FAA's number for this variant within an origin, destination and type. Not a preference ranking. */
				sequence: row.sequence,
				origin: row.origin_iata,
				originArtcc: row.origin_artcc,
				dest: row.dest_iata,
				destArtcc: row.dest_artcc,
				route: row.route_string,
				hours: [row.hour_1, row.hour_2, row.hour_3].filter((hour): hour is string => Boolean(hour)),
				area: row.area,
				aircraft: row.aircraft,
				altitude: row.altitude,
				direction: row.direction,
				...resolveRoute(row, gazetteer)
			}))
		};
	});

const RouteCounts = z.object({ outbound: z.number(), inbound: z.number() });

const CoverageOutput = z.object({
	/** by IATA code */
	airports: z.record(z.string(), RouteCounts),
	/** by ARTCC code */
	artccs: z.record(z.string(), RouteCounts)
});

/** Merges two grouped counts (routes out of a code, routes into it) into one entry per code. */
const tally = (outbound: ReadonlyArray<readonly [string, number]>, inbound: ReadonlyArray<readonly [string, number]>) => {
	const counts: Record<string, { outbound: number; inbound: number }> = {};
	for (const [code, count] of outbound) (counts[code] ??= { outbound: 0, inbound: 0 }).outbound = count;
	for (const [code, count] of inbound) (counts[code] ??= { outbound: 0, inbound: 0 }).inbound = count;
	return counts;
};

/**
 * How many preferred routes leave and arrive at every airport and ARTCC that has any.
 * Lets the map show which airports and centers are worth clicking before running a search.
 */
export const coverage = base
	.input(z.void())
	.use(cache("__airspace:routing:coverage", "10 minutes", CoverageOutput))
	.handler(async () => {
		const [origins, dests, originArtccs, destArtccs] = await Promise.all([
			prisma.preferredRoute.groupBy({ by: ["origin_iata"], _count: { _all: true } }),
			prisma.preferredRoute.groupBy({ by: ["dest_iata"], _count: { _all: true } }),
			prisma.preferredRoute.groupBy({ by: ["origin_artcc"], _count: { _all: true } }),
			prisma.preferredRoute.groupBy({ by: ["dest_artcc"], _count: { _all: true } })
		]);

		return {
			airports: tally(
				origins.map(row => [row.origin_iata, row._count._all] as const),
				dests.map(row => [row.dest_iata, row._count._all] as const)
			),
			artccs: tally(
				originArtccs.map(row => [row.origin_artcc, row._count._all] as const),
				destArtccs.map(row => [row.dest_artcc, row._count._all] as const)
			)
		};
	});

export const routing = { search, coverage };
