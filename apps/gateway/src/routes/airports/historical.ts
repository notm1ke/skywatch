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
 
		// create ranges for multi-day spanning incidents
		for (const incident of history) {
			const start = moment(incident.observed_at).startOf('day');
			
			// ongoing and still today or ended & same day
			if ((!incident.resolved_at && start.isSame(moment(), 'day')) || (incident.resolved_at && start.isSame(moment(incident.resolved_at), 'day'))) {
				continue;
			}
			
			// still ongoing - extend to today
			if (!incident.resolved_at && !moment().isSame(incident.observed_at, 'day')) {
				const end = moment().startOf('day');
				const range = Array.from({ length: end.diff(start, 'days') }).map((_, i) => start.clone().add(i+1, 'day'));
				for (const day of range) {
					dayMappings[day.format(dayFmt)] = dayMappings[day.format(dayFmt)] || [];
					dayMappings[day.format(dayFmt)]!.push(incident);
				}
				
				continue;
			}
			
			// ended but multi-day
			if (incident.resolved_at) {
				const end = moment(incident.resolved_at).startOf('day');
				const range = Array.from({ length: end.diff(start, 'days') }).map((_, i) => start.clone().add(i+1, 'day'));
				for (const day of range) {
					dayMappings[day.format(dayFmt)] = dayMappings[day.format(dayFmt)] || [];
					dayMappings[day.format(dayFmt)]!.push(incident);
				}
				
				continue;
			}	
		}
		
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
			
			const dt = new Date(date.toDate().toDateString());
			
			days.push({
				dt, incidents,
				indicator: major,
			})
		}
		
		return days;
	})

export const historical = {
	incidentsByIata
}