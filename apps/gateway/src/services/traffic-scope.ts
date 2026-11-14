import { Prisma } from "@/prisma/generated/client";

export type TrafficScope = {
	airspace?: string;
	airport?: string;
	date?: string;
};

/**
 * WHERE fragment narrowing `airport_traffic_record` rows to a scope (a single airport and/or an ARTCC).
 * With neither set it's empty, so the national airspace queries behave exactly as before.
 * Use inside queries that select FROM `airport_traffic_record` without an alias.
 */
export const trafficScopeSql = ({ airspace, airport }: TrafficScope) => Prisma.sql`
	${airport
		? Prisma.sql`AND airport_traffic_record.iata_code = ${airport}`
		: Prisma.empty}
	${airspace
		? Prisma.sql`AND airport_traffic_record.iata_code IN (
			SELECT iata_code FROM airports WHERE artcc = ${airspace}
		)`
		: Prisma.empty}
`;

/** Cache key suffix that can't collide between scopes (airport vs airspace vs national, and per day). */
export const trafficScopeKey = ({ airspace, airport, date }: TrafficScope) =>
	`${airport ?? "-"}:${airspace ?? "all"}:${date ?? "latest"}`;
