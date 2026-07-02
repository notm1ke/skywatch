import { z } from "zod/v4";
import { defineTask } from "nitro/task";
import { prisma } from "@/services/prisma";
import { AirportAdvisory } from "@/schemas";
import { interruptions } from "@/routes/airspace/interruptions";
import { AirportInterruptionType } from "@/prisma/generated/enums";

const toIncidentType = (advisory: z.infer<typeof AirportAdvisory>): AirportInterruptionType | null => {
	if (advisory.airportClosure) return "airport_closure";
	if (advisory.groundStop) return "ground_stop";
	if (advisory.groundDelay) return "ground_delay";
	if (advisory.arrivalDelay && advisory.departureDelay) return "dual_delay";
	if (advisory.arrivalDelay) return "arrival_delay";
	if (advisory.departureDelay) return "departure_delay";
	return null;
}

// todo: in the future as a `remarks` field where we can extract delay reason, etc.
type SlimAirportIncident = {
	iata: string;
	incidentType: AirportInterruptionType;
}

const airportStatus = defineTask({
	meta: {
		name: "airport-status",
		description: "Pulls airport statuses for use in the status tracker",
	},
	async run() {
		const start = Date.now();
		console.log("Triggering airport status retrieval..");
		
		const statuses = await interruptions
			.active({})
			.then(results => results.map(result => {
				const incidentType = toIncidentType(result);
				if (!incidentType) return null;
				
				return {
					iata: result.airportId,
					incidentType
				}
			}))
			.then(results => results.filter(Boolean)) as SlimAirportIncident[];
		
		const ongoing = await prisma.airportStatusHistory.findMany({
			where: { resolved_at: null }
		});
		
		// try to close out resolved incidents
		for (const incident of ongoing) {
			const match = statuses.find(
				result => result.iata === incident.airport_iata
					&& result.incidentType === incident.event_type
			);
			
			if (!match) await prisma
				.airportStatusHistory
				.update({
					where: { event_id: incident.event_id },
					data: { resolved_at: new Date() }
				})
				.then(() => console.log(`[airport-status] Closed incident ${incident.event_id} at ${incident.airport_iata}.`));
		}
		
		// try to add new incidents
		for (const incident of statuses) {
			const exists = await prisma.airportStatusHistory.count({
				where: { airport_iata: incident.iata, event_type: incident.incidentType, resolved_at: null }
			});
			
			if (!exists) await prisma
				.airportStatusHistory
				.create({
					data: {
						airport: { connect: { iata_code: incident.iata } },
						event_type: incident.incidentType,
						observed_at: new Date(),
					}
				})
				.then(() => console.log(`[airport-status] Created ${incident.incidentType} incident for ${incident.iata}.`));
		}
		
		console.log(`[airport-status] Done in ${Date.now() - start}ms.`);
		return { result: "Success" };
	},
});

export default airportStatus;