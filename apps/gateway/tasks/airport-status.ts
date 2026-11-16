import { z } from "zod/v4";
import { defineTask } from "nitro/task";
import { prisma } from "@/services/prisma";
import { AirportAdvisory, closureScope } from "@/schemas";
import { interruptions } from "@/routes/airspace/interruptions";
import { AirportClosureScope, AirportInterruptionType } from "@/prisma/generated/enums";

type Advisory = z.infer<typeof AirportAdvisory>;

const toIncidentType = (advisory: Advisory): AirportInterruptionType | null => {
	if (advisory.airportClosure) return "airport_closure";
	if (advisory.groundStop) return "ground_stop";
	if (advisory.groundDelay) return "ground_delay";
	if (advisory.arrivalDelay && advisory.departureDelay) return "dual_delay";
	if (advisory.arrivalDelay) return "arrival_delay";
	if (advisory.departureDelay) return "departure_delay";
	return null;
}

/** What the FAA says about an incident, kept as it says it: none of this is interpreted on the way in. */
type Details = {
	reason: string | null;
	closureScope: AirportClosureScope | null;
	startsAt: Date | null;
	endsAt: Date | null;
};

const asDate = (value: string | null | undefined) => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

const blank = (value: string | null | undefined) => value?.trim() || null;

const detailsOf = (advisory: Advisory, incidentType: AirportInterruptionType): Details => {
	switch (incidentType) {
		case "airport_closure": return {
			// the qualifier after "AIRPORT CLOSED": empty for an outright closure
			reason: blank(advisory.airportClosure?.text),
			closureScope: closureScope(advisory.airportClosure),
			startsAt: asDate(advisory.airportClosure?.startTime),
			endsAt: asDate(advisory.airportClosure?.endTime)
		};
		case "ground_stop": return {
			reason: blank(advisory.groundStop?.impactingCondition),
			closureScope: null,
			startsAt: asDate(advisory.groundStop?.startTime),
			endsAt: asDate(advisory.groundStop?.endTime)
		};
		case "ground_delay": return {
			reason: blank(advisory.groundDelay?.impactingCondition),
			closureScope: null,
			startsAt: asDate(advisory.groundDelay?.startTime),
			endsAt: asDate(advisory.groundDelay?.endTime)
		};
		default: return {
			// "WX:Wind", "VOL:Volume"
			reason: blank((advisory.departureDelay ?? advisory.arrivalDelay)?.reason),
			closureScope: null,
			startsAt: null,
			endsAt: null
		};
	}
};

type SlimAirportIncident = {
	iata: string;
	incidentType: AirportInterruptionType;
	details: Details;
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
					incidentType,
					details: detailsOf(result, incidentType)
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

			if (!match) {
				await prisma
					.airportStatusHistory
					.update({
						where: { event_id: incident.event_id },
						data: { resolved_at: new Date() }
					})
					.then(() => console.log(`[airport-status] Closed incident ${incident.event_id} at ${incident.airport_iata}.`));

				continue;
			}

			// An incident that was open before these columns existed has none of the detail: fill it in while it's still
			// in the feed, so the longer-running ones (a closure that lasts a week) aren't left blank.
			const missing = incident.reason === null && incident.starts_at === null && incident.closure_scope === null;
			const available = match.details.reason !== null || match.details.startsAt !== null || match.details.closureScope !== null;

			if (missing && available) await prisma
				.airportStatusHistory
				.update({
					where: { event_id: incident.event_id },
					data: {
						reason: match.details.reason,
						closure_scope: match.details.closureScope,
						starts_at: match.details.startsAt,
						ends_at: match.details.endsAt
					}
				})
				.then(() => console.log(`[airport-status] Filled in the detail of ${incident.event_type} at ${incident.airport_iata}.`));
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
						reason: incident.details.reason,
						closure_scope: incident.details.closureScope,
						starts_at: incident.details.startsAt,
						ends_at: incident.details.endsAt
					}
				})
				.then(() => console.log(`[airport-status] Created ${incident.incidentType} incident for ${incident.iata}.`));
		}

		console.log(`[airport-status] Done in ${Date.now() - start}ms.`);
		return { result: "Success" };
	},
});

export default airportStatus;
