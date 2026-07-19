import { z } from "zod/v4";
import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { InterruptionHistory } from "@/schemas/airport";
import { AirportWhereInput } from "@/prisma/generated/models";

const WINDOW_HOURS = 24;

const interruptionHistory = base
	.input(airspaceInput)
	.handler(async ({ input: { airspace } }) => {
		const now = new Date();
		const windowStart = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

		let airportIata: string[] | undefined;
		if (airspace) {
			const where: AirportWhereInput = { artcc: { equals: airspace } };
			const airports = await prisma.airport.findMany({ select: { iata_code: true }, where });
			airportIata = airports.map(airport => airport.iata_code);
		}

		const history = await prisma.airportStatusHistory.findMany({
			where: {
				...(airportIata ? { airport_iata: { in: airportIata } } : {}),
				observed_at: { lte: now },
				OR: [
					{ resolved_at: null },
					{ resolved_at: { gte: windowStart } }
				]
			},
			orderBy: { observed_at: 'asc' }
		});

		return history as z.infer<typeof InterruptionHistory>;
	})

export const historical = {
	interruptionHistory
};
