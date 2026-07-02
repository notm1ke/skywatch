import axios from "axios";

import { z } from "zod/v4";
import { ORPCError } from "@orpc/server";
import { cache } from "@/middleware/cache";
import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { capitalizeFirst, formatFaaTime } from "@/utils";
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
		"__airspace:status",
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
		"__airspace:planned",
		"5 minutes",
		PlannedAdvisories
	))
	.handler(async ({ input: { airspace } }) => axios
		.get('https://nasstatus.faa.gov/api/operations-plan')
		.then(res => res.data)
		.then(OpsPlanResponse.safeParse)
		.then(raw => {
			if (!raw.success) throw new ORPCError("UPSTREAM_ERROR");
			return raw.data;
		})
		.then(data => data.terminalPlanned.map(entry => {
			// nas started reporting `time` as ""
			if (!entry.time.trim()) {
				const [rawTime, rest] = entry.event.split('\t');
				const [iataCode, ...eventType] = rest.split(' ');
				
				return {
					iataCode: iataCode.slice(1).split('/'),
					time: formatFaaTime(rawTime.split(' ')[1]),
					forecastType: rawTime.split(' ')[0] === 'AFTER'
						? 'after'
						: 'until',
					eventType: capitalizeFirst(eventType.join(' ').toLowerCase())
				} as z.infer<typeof PlannedAirportEvent>;
			}
			
			const [iataCode, ...eventType] = entry.event.split(' ');
			const rawTime = entry.time.split(' ')[1];

			return {
				iataCode: iataCode.split('/'),
				time: formatFaaTime(rawTime),
				forecastType: entry.time.split(' ')[0] === 'AFTER'
					? 'after'
					: 'until',
				eventType: capitalizeFirst(eventType.join(' ').toLowerCase())
			} as z.infer<typeof PlannedAirportEvent>;
		}))
	)
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
