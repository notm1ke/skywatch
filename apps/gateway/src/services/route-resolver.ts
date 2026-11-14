import { prisma } from "@/services/prisma";

/**
 * Turns FAA route strings ("ORD ESTRR8 IPTAY CHOPZ ... AEX CAAGE LAX") into positions we can draw.
 *
 * Fixes come from the `waypoints` table, navaids from `airport_nav` and airways from `airways`.
 * When a route names an airway between two fixes ("MLF J80 GLD"), the points between those fixes on the airway's
 * point list are placed too, so the line follows the airway instead of cutting straight across.
 */

export type RouteFix = {
	id: string;
	lat: number;
	lon: number;
	/** airport = the route's origin / destination, waypoint = FAA fix, navaid = VOR/NDB/etc, procedure = the fix a SID/STAR is named after */
	kind: "airport" | "waypoint" | "navaid" | "procedure";
	/** set on points added by following an airway: the airway they sit on (J80) */
	via?: string;
};

export type ResolvedRoute = {
	/** origin airport, every fix we could place (including the points along followed airways), destination airport */
	fixes: RouteFix[];
	/** airways named in the route string (J80, Q816, ...) */
	airways: string[];
	/** airways we couldn't follow (a neighbouring fix isn't on the airway's point list), so the line cuts straight across them */
	airwayGaps: string[];
	/** SID/STAR names we couldn't place */
	procedures: string[];
	/** tokens that matched nothing we know */
	unresolved: string[];
	/** true when nothing was left unplaced (airways don't count: they're expected, and `airwayGaps` reports the ones we couldn't follow) */
	complete: boolean;
};

type Point = { lat: number; lon: number };
type Navaid = Point & { type: string };

export type Gazetteer = {
	airports: Map<string, Point>;
	waypoints: Map<string, Point>;
	/** idents aren't unique across navaids (an NDB and a VOR can share one), so each maps to a list */
	navaids: Map<string, Navaid[]>;
	/** an airway id can exist in more than one location (contiguous US, Alaska, Hawaii), so each maps to a list of point lists */
	airways: Map<string, string[][]>;
};

type RouteInput = {
	origin_iata: string;
	dest_iata: string;
	route_string: string;
};

const AIRWAY = /^[A-Z]{1,2}\d{1,4}$/; // J80 V1 Q816 T200 UL9 ...
const PROCEDURE = /^[A-Z]{3,6}\d$/; // HYLND7 BDEGA4 FYTTE7

/** SID/STAR names are placed at the fix they're named after: HYLND7 -> HYLND */
const procedureBase = (token: string) => token.replace(/\d$/, "");

type ParsedRoute = {
	/** the origin code as written in the file (it can differ from our IATA key: the file says CRQ where we have CLD) */
	first: string;
	/** the destination code as written in the file */
	last: string;
	/** everything between the endpoints, "TRANSITION.PROCEDURE" tokens split in two, DCT dropped */
	pieces: string[];
};

/**
 * Every route string in the FAA file starts with its origin and ends with its destination (checked against the whole
 * file), so the endpoints are taken by position rather than by comparing codes.
 */
const parseRoute = (routeString: string): ParsedRoute => {
	const parts = routeString.split(/\s+/).filter(Boolean);
	return {
		first: parts[0] ?? "",
		last: parts[parts.length - 1] ?? "",
		pieces: parts
			.slice(1, -1)
			.flatMap(token => token.split("."))
			.filter(token => token && token !== "DCT")
	};
};

/**
 * The points strictly between `from` and `to` on an airway, in travel order, or null when the airway doesn't contain
 * both (then the caller joins the two fixes directly). Tries the names as written, then with a SID/STAR name reduced
 * to the fix it's named after.
 */
const followAirway = (strings: string[][] | undefined, from: string, to: string): string[] | null => {
	if (!strings) return null;

	const attempts: Array<[string, string]> = [[from, to]];
	const reduced: [string, string] = [
		PROCEDURE.test(from) ? procedureBase(from) : from,
		PROCEDURE.test(to) ? procedureBase(to) : to
	];
	if (reduced[0] !== from || reduced[1] !== to) attempts.push(reduced);

	for (const [start, end] of attempts) {
		for (const points of strings) {
			const a = points.indexOf(start);
			const b = points.indexOf(end);
			if (a === -1 || b === -1 || a === b) continue;
			return a < b ? points.slice(a + 1, b) : points.slice(b + 1, a).reverse();
		}
	}

	return null;
};

/** The pieces on either side of `pieces[index]` (the route's endpoints at the edges). */
const neighbours = (parsed: ParsedRoute, index: number): [string, string] => [
	index > 0 ? parsed.pieces[index - 1] : parsed.first,
	index < parsed.pieces.length - 1 ? parsed.pieces[index + 1] : parsed.last
];

let warnedAirwaysUnavailable = false;

/** Airways by id. If the table isn't there yet (its migration hasn't run) routes still resolve, they just cut across airways. */
const loadAirways = async (ids: string[]): Promise<Map<string, string[][]>> => {
	const airways = new Map<string, string[][]>();
	if (!ids.length) return airways;

	try {
		const rows = await prisma.airway.findMany({
			where: { airway_id: { in: ids } },
			select: { airway_id: true, points: true }
		});

		for (const row of rows) {
			const list = airways.get(row.airway_id) ?? [];
			list.push(row.points);
			airways.set(row.airway_id, list);
		}
	} catch (error) {
		if (!warnedAirwaysUnavailable) {
			warnedAirwaysUnavailable = true;
			console.warn("[routing] Couldn't load airways, drawing routes straight across them:", error instanceof Error ? error.message : error);
		}
	}

	return airways;
};

/** Loads everything needed to place a set of routes in a handful of queries, however many routes there are. */
export const loadGazetteer = async (routes: RouteInput[]): Promise<Gazetteer> => {
	const idents = new Set<string>();
	const endpoints = new Set<string>();
	const airwayCandidates = new Set<string>();
	const parsed = routes.map(route => parseRoute(route.route_string));

	routes.forEach((route, i) => {
		endpoints.add(route.origin_iata);
		endpoints.add(route.dest_iata);

		for (const token of parsed[i].pieces) {
			idents.add(token);
			if (PROCEDURE.test(token)) idents.add(procedureBase(token));
			if (AIRWAY.test(token)) airwayCandidates.add(token);
		}
	});

	const airways = await loadAirways([...airwayCandidates]);

	// the points along every airway leg need placing too
	parsed.forEach(route => {
		route.pieces.forEach((token, index) => {
			if (!airways.has(token)) return;
			const [from, to] = neighbours(route, index);
			for (const id of followAirway(airways.get(token), from, to) ?? []) idents.add(id);
		});
	});

	const ids = [...idents];
	const [airportRows, waypointRows, navaidRows] = await Promise.all([
		prisma.airport.findMany({
			where: { iata_code: { in: [...endpoints] } },
			select: { iata_code: true, latitude_deg: true, longitude_deg: true }
		}),
		prisma.waypoint.findMany({
			where: { waypoint_id: { in: ids } },
			select: { waypoint_id: true, latitude_deg: true, longitude_deg: true }
		}),
		prisma.airportNav.findMany({
			where: { ident: { in: ids }, latitude_deg: { not: null }, longitude_deg: { not: null } },
			select: { ident: true, type: true, latitude_deg: true, longitude_deg: true }
		})
	]);

	const gazetteer: Gazetteer = { airports: new Map(), waypoints: new Map(), navaids: new Map(), airways };

	for (const airport of airportRows) {
		gazetteer.airports.set(airport.iata_code, { lat: airport.latitude_deg, lon: airport.longitude_deg });
	}

	for (const waypoint of waypointRows) {
		gazetteer.waypoints.set(waypoint.waypoint_id, { lat: waypoint.latitude_deg, lon: waypoint.longitude_deg });
	}

	for (const navaid of navaidRows) {
		// the query already excludes nulls; this narrows the types
		if (navaid.latitude_deg == null || navaid.longitude_deg == null) continue;
		const list = gazetteer.navaids.get(navaid.ident) ?? [];
		list.push({ type: navaid.type, lat: navaid.latitude_deg, lon: navaid.longitude_deg });
		gazetteer.navaids.set(navaid.ident, list);
	}

	return gazetteer;
};

/** Great-circle distance in nautical miles. */
const distance = (a: Point, b: Point) => {
	const rad = Math.PI / 180;
	const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2
		+ Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
	return 2 * 3440.065 * Math.asin(Math.sqrt(h));
};

export const resolveRoute = (route: RouteInput, gazetteer: Gazetteer): ResolvedRoute => {
	const parsed = parseRoute(route.route_string);
	const origin = gazetteer.airports.get(route.origin_iata);
	const destination = gazetteer.airports.get(route.dest_iata);

	const fixes: RouteFix[] = origin ? [{ id: route.origin_iata, ...origin, kind: "airport" }] : [];
	const airways: string[] = [];
	const airwayGaps: string[] = [];
	const procedures: string[] = [];
	const unresolved: string[] = [];

	const lookup = (id: string, near?: Point): Pick<RouteFix, "lat" | "lon" | "kind"> | undefined => {
		const navaids = gazetteer.navaids.get(id);
		if (navaids?.length) {
			// routes use VOR-type navaids as fixes (an NDB with the same ident is a different thing), then take the nearest
			const rank = (type: string) => (type.startsWith("NDB") ? 1 : 0);
			const best = [...navaids].sort((a, b) => rank(a.type) - rank(b.type) || (near ? distance(near, a) - distance(near, b) : 0))[0];
			return { lat: best.lat, lon: best.lon, kind: "navaid" };
		}

		const waypoint = gazetteer.waypoints.get(id);
		return waypoint ? { ...waypoint, kind: "waypoint" } : undefined;
	};

	// a SID/STAR name and the fix it's named after (HYLND7 HYLND) resolve to the same place: keep one
	const push = (fix: RouteFix) => {
		if (fixes[fixes.length - 1]?.id !== fix.id) fixes.push(fix);
	};

	parsed.pieces.forEach((token, index) => {
		const hit = lookup(token, fixes[fixes.length - 1]);
		if (hit) return push({ id: token, ...hit });

		if (AIRWAY.test(token)) {
			airways.push(token);

			const [from, to] = neighbours(parsed, index);
			const along = followAirway(gazetteer.airways.get(token), from, to);
			if (!along) return void airwayGaps.push(token);

			for (const id of along) {
				const point = lookup(id, fixes[fixes.length - 1]);
				if (point) push({ id, ...point, via: token });
			}

			return;
		}

		if (PROCEDURE.test(token)) {
			const base = lookup(procedureBase(token), fixes[fixes.length - 1]);
			if (base) push({ id: procedureBase(token), ...base, kind: "procedure" });
			else procedures.push(token);
			return;
		}

		unresolved.push(token);
	});

	if (destination) fixes.push({ id: route.dest_iata, ...destination, kind: "airport" });

	return {
		fixes,
		airways,
		airwayGaps,
		procedures,
		unresolved,
		complete: procedures.length === 0 && unresolved.length === 0
	};
};
