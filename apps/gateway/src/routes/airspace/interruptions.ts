import axios from "axios";

import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { cache } from "@/middleware/cache";
import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { byTime, parsePlannedEntry } from "@/services/ops-plan";
import { AirportWhereInput } from "@/prisma/generated/models";

import {
	AirportAdvisory,
	PlannedAirportEvent,
	RawPlannedEvent
} from "@/schemas/faa";

const AirspaceInterruptions = z.array(AirportAdvisory);

const active = base
	.input(airspaceInput)
	.use(cache(
		input => `__airspace:status:${input.airspace ?? "any"}`,
		"1 minutes",
		AirspaceInterruptions,
	))
	.handler(async ({ input: { airspace } }) => axios
		.get('https://nasstatus.faa.gov/api/airport-events')
		.then(res => res.data)
		.then(AirspaceInterruptions.safeParse)
		.then(async result => {
			if (!result.success) throw new ORPCError("UPSTREAM_ERROR");

			const where: AirportWhereInput = {};
			if (airspace) where.artcc = { equals: airspace };
			const tracked = await prisma
				.airport
				.findMany({ select: { iata_code: true, artcc: true }, where })
				.then(results => new Set(...[results.map(result => result.iata_code)]));
		
			return result.data.filter(entry => tracked.has(entry.airportId));
		})
	)
	.callable();

const PlannedAdvisories = z.array(PlannedAirportEvent);

const OpsPlanResponse = z.object({
	link: z.string(),
	terminalPlanned: z.array(RawPlannedEvent),
	enRoutePlanned: z.array(RawPlannedEvent),
});

const planned = base
	.input(airspaceInput)
	.use(cache(
		input => `__airspace:planned:v2:${input.airspace ?? "any"}`,
		"5 minutes",
		PlannedAdvisories
	))
	.handler(async ({ input: { airspace } }) => {
		const airports = await prisma.airport.findMany({ select: { iata_code: true, artcc: true } });
		const known = new Set(airports.map(airport => airport.iata_code));
		const tracked = airspace
			? new Set(airports.filter(airport => airport.artcc === airspace).map(airport => airport.iata_code))
			: null;

		return axios
			.get('https://nasstatus.faa.gov/api/operations-plan')
			.then(res => res.data)
			.then(OpsPlanResponse.safeParse)
			.then(raw => {
				if (!raw.success) throw new ORPCError("UPSTREAM_ERROR");
				return raw.data;
			})
			// the feed is free text and has changed shape before: see services/ops-plan.ts for what it tolerates
			.then(data => data.terminalPlanned
				.flatMap(entry => parsePlannedEntry(entry, new Date(), known))
				.sort(byTime)
			)
			.then(events => tracked
				? events.filter(event => event.iataCode !== null && tracked.has(event.iataCode))
				: events
			);
	})
	.callable();

const all = base
	.input(airspaceInput)
	.handler(async ({ input: { airspace } }) => {
		const [current, plannedEvents] = await Promise.all([
			active({ airspace }),
			planned({ airspace })
		]);

		return { active: current, planned: plannedEvents };
	});

export const interruptions = {
	all, active, planned
}
