import moment from "moment-timezone";

import { z } from "zod/v4";
import { base, iataInput } from "@/utils";
import { prisma } from "@/services/prisma";
import { injectAirportByIata } from "@/middleware/airport-by-iata";
import { IncidentHistory, IncidentHistoryEntry, IncidentType } from "@/schemas";

const incidentsByIata = base
	.input(iataInput)
	.use(injectAirportByIata())
	.handler(async ({ context: { airport } }) => {
		const dayRange = 45;
		const start = moment().startOf('day').subtract(dayRange, 'day');
		const history = await prisma.airportStatusHistory.findMany({
			where: {
				airport_iata: airport.iata_code,
				observed_at: { gte: start.toDate() }
			},
			orderBy: { observed_at: 'asc' }
		});
		
		if (!history.length) {
			const start = moment().startOf('day').subtract(dayRange, 'day');
			return Array.from({ length: dayRange }).map((_, i) => ({
				dt: start.clone().add(i, 'day').toDate(),
				indicator: "normal",
				incidents: []
			})) as z.infer<typeof IncidentHistory>;
		}
		
		const dayFmt = "MM/DD/yyyy";
		const dayMappings = Object.groupBy(history, item => moment(item.observed_at).format(dayFmt));
		const sortOrder = Object.keys(IncidentType).map((key, i) => ({
			incidentType: key,
			priority: i
		}));
		
		const days = Array<z.infer<typeof IncidentHistoryEntry>>();
		for (let i = 1; i <= dayRange; i++) {
			const date = start.clone().add(i, 'day');
			const incidents = dayMappings[date.format(dayFmt)] || [];
			const major = incidents.map(incident => incident.event_type).reduce((prev, cur) => {
				const prevPriority = sortOrder.find(item => item.incidentType === prev)?.priority || Infinity;
				const curPriority = sortOrder.find(item => item.incidentType === cur)?.priority || Infinity;
				return prevPriority < curPriority ? prev : cur;
			}, "normal" as any);
			
			days.push({
				dt: date.toDate(),
				indicator: major,
				incidents,
			})
		}
		
		return days;
	})

export const historical = {
	incidentsByIata
}