import moment from "moment-timezone";

import { prisma } from "@/services/prisma";
import { airspaceInput, base } from "@/utils";
import { ChartConfig, TrafficFlow } from "@/schemas";
import { injectDataMarker } from "@/middleware/traffic-marker";
import { AirportTrafficFlowWhereInput } from "@/prisma/generated/models";

export const arrivalCapacity = base
	.input(airspaceInput)
	.use(injectDataMarker)
	.handler(async ({ context: { marker }, input: { airspace } }) => {
		const where: AirportTrafficFlowWhereInput = marker;
		if (airspace) {
			where.airport = {};
			where.airport.artcc = { equals: airspace };
		}
		
		const airports = await prisma.airportTrafficFlow.findMany({
			where, select: { arrival_rates: true }
		});

		const duration = moment.duration(1.5, 'hours');
		const spans = Array
			.from({ length: 16 }, (_, i) => moment()
				.startOf('day')
				.add(i * duration.as('hours'), 'hours')
				.format('HHmm')
			);

		const dataset = airports.reduce((acc, airport) => {
			const rates = airport.arrival_rates || [];
			for (let i = 0; i < 16; i++) {
				acc[i] = (acc[i] || 0) + Number(rates[i]);
			}
			return acc;
		}, [] as number[]);

		const data: TrafficFlow<'rate'> = {
			config: {
				rate: {
					label: "Throughput",
					color: "var(--color-green-400)"
				}
			} satisfies ChartConfig,
			dataKeys: ['rate'],
			data: dataset.map((rate, index) => ({
				time: spans[index],
				datum: { rate },
				cumulative: 0,
			}))
		};

		return data;
	});
