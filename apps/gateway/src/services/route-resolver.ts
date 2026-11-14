import { prisma } from "@/services/prisma";

/**
 * Turns FAA route strings ("ORD ESTRR8 IPTAY CHOPZ ... AEX CAAGE LAX") into positions we can draw.
 *
 * Fixes come from the `waypoints` table and navaids from `airport_nav`. Airway geometry (J80, V39, ...) isn't
 * available, so airways are only recorded and the fixes either side of them are joined directly.
 */

export type RouteFix = {
	id: string;
	lat: number;
	lon: number;
	/** airport = the route's origin / destination, waypoint = FAA fix, navaid = VOR/NDB/etc, procedure = the fix a SID/STAR is named after */
	kind: "airport" | "waypoint" | "navaid" | "procedure";
};

export type ResolvedRoute = {
	/** origin airport, every fix we could place, destination airport */
	fixes: RouteFix[];
	/** airways in the route string (J80, Q816, ...); no geometry, so the fixes either side are joined directly */
	airways: string[];
	/** SID/STAR names we couldn't place */
	procedures: string[];
	/** tokens that matched nothing we know */
	unresolved: string[];
	/** true when nothing was left unplaced (airways don't count: they're expected) */
	complete: boolean;
};

type Point = { lat: number; lon: number };
type Navaid = Point & { type: string };

export type Gazetteer = {
	airports: Map<string, Point>;
	waypoints: Map<string, Point>;
	/** idents aren't unique across navaids (an NDB and a VOR can share one), so each maps to a list */
	navaids: Map<string, Navaid[]>;
};

type RouteInput = {
	origin_iata: string;
	dest_iata: string;
	route_string: string;
};

const AIRWAY = /^[A-Z]{1,2}\d{1,4}$/; // J80 V1 Q816 T200 UL9 ...
const PROCEDURE = /^[A-Z]{3,6}\d$/; // HYLND7 BDEGA4 FYTTE7

/**
 * The tokens between the endpoints. Every route string in the FAA file starts with its origin and ends with its
 * destination (checked against the whole file), and those codes can differ from our IATA keys (the file says CRQ
 * where we have CLD), so the endpoints are dropped by position rather than by comparing codes.
 * "TRANSITION.PROCEDURE" style tokens are split in two.
 */
const middleTokens = (routeString: string) => routeString
	.split(/\s+/)
	.filter(Boolean)
	.slice(1, -1)
	.flatMap(token => token.split("."))
	.filter(token => token && token !== "DCT");

/** SID/STAR names are placed at the fix they're named after: HYLND7 -> HYLND */
const procedureBase = (token: string) => token.replace(/\d$/, "");

/** Loads everything needed to place a set of routes in three queries, however many routes there are. */
export const loadGazetteer = async (routes: RouteInput[]): Promise<Gazetteer> => {
	const idents = new Set<string>();
	const endpoints = new Set<string>();

	for (const route of routes) {
		endpoints.add(route.origin_iata);
		endpoints.add(route.dest_iata);

		for (const token of middleTokens(route.route_string)) {
			idents.add(token);
			if (PROCEDURE.test(token)) idents.add(procedureBase(token));
		}
	}

	const ids = [...idents];
	const [airports, waypoints, navaids] = await Promise.all([
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

	const gazetteer: Gazetteer = { airports: new Map(), waypoints: new Map(), navaids: new Map() };

	for (const airport of airports) {
		gazetteer.airports.set(airport.iata_code, { lat: airport.latitude_deg, lon: airport.longitude_deg });
	}

	for (const waypoint of waypoints) {
		gazetteer.waypoints.set(waypoint.waypoint_id, { lat: waypoint.latitude_deg, lon: waypoint.longitude_deg });
	}

	for (const navaid of navaids) {
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
	const origin = gazetteer.airports.get(route.origin_iata);
	const destination = gazetteer.airports.get(route.dest_iata);

	const fixes: RouteFix[] = origin ? [{ id: route.origin_iata, ...origin, kind: "airport" }] : [];
	const airways: string[] = [];
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

	for (const token of middleTokens(route.route_string)) {
		const previous = fixes[fixes.length - 1];

		// a SID/STAR name and the fix it's named after (HYLND7 HYLND) resolve to the same place: keep one
		const push = (fix: RouteFix) => {
			if (previous?.id !== fix.id) fixes.push(fix);
		};

		const hit = lookup(token, previous);
		if (hit) {
			push({ id: token, ...hit });
		} else if (AIRWAY.test(token)) {
			airways.push(token);
		} else if (PROCEDURE.test(token)) {
			const base = lookup(procedureBase(token), previous);
			if (base) push({ id: procedureBase(token), ...base, kind: "procedure" });
			else procedures.push(token);
		} else {
			unresolved.push(token);
		}
	}

	if (destination) fixes.push({ id: route.dest_iata, ...destination, kind: "airport" });

	return {
		fixes,
		airways,
		procedures,
		unresolved,
		complete: procedures.length === 0 && unresolved.length === 0
	};
};
