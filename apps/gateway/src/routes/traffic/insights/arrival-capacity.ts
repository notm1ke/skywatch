import moment from "moment-timezone";

import { z } from "zod/v4";
import { base } from "@/utils";
import { prisma } from "@/services/prisma";
import { ChartConfig, TrafficFlow } from "@/schemas";
import { injectDataMarker } from "@/middleware/traffic-marker";

export const arrivalCapacity = base
	.input(z.void())
	.use(injectDataMarker)
	.handler(async ({ context: { marker } }) => {
		const airports = await prisma.airportTrafficFlow.findMany({
			where: marker,
			select: { arrival_rates: true }
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
