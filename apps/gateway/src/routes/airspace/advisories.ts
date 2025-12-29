import axios from "axios";

import { z } from "zod/v4";
import { base } from "~/utils";
import { ORPCError } from "@orpc/server";
import { cache } from "~/middleware/cache";
import { capitalizeFirst, formatFaaTime } from "~/utils";

import {
	AirportAdvisory,
	PlannedAirportEvent,
	RawPlannedEvent
} from "~/schemas/faa";

const AirspaceAdvisories = z.array(AirportAdvisory);

const active = base
	.input(z.void())
	.use(cache(
		"__airspace:status", 
		"1 minutes",
		AirspaceAdvisories,
	))
	.handler(async () => axios
		.get('https://nasstatus.faa.gov/api/airport-events')
		.then(res => res.data)
		.then(AirspaceAdvisories.safeParse)
		.then(result => {
			if (result.success) return result.data;
			throw new ORPCError("UPSTREAM_ERROR"); 
		})
	);

const PlannedAdvisories = z.array(PlannedAirportEvent);

const OpsPlanResponse = z.object({
	link: z.string(),
	terminalPlanned: z.array(RawPlannedEvent),
	enRoutePlanned: z.array(RawPlannedEvent),
});

const planned = base
	.input(z.void())
	.use(cache(
		"__airspace:planned",
		"5 minutes",
		PlannedAdvisories
	))
	.handler(async () => axios
		.get('https://nasstatus.faa.gov/api/operations-plan')
		.then(res => res.data)
		.then(OpsPlanResponse.safeParse)
		.then(raw => {
			if (!raw.success) throw new ORPCError("UPSTREAM_ERROR");
			return raw.data;
		})
		.then(data => data.terminalPlanned.map(entry => {
			const [iataCode, ...eventType] = entry.event.split(' ');
			const rawTime = entry.time.split(' ')[1];

			return {
				iataCode,
				time: formatFaaTime(rawTime),
				forecastType: entry.time.split(' ')[0] === 'AFTER'
					? 'after'
					: 'until',
				eventType: capitalizeFirst(eventType.join(' ').toLowerCase())
			}
		}))
	);

export const advisories = {
	active, planned
}