import { z } from "zod/v4";
import { prisma } from "~/services/prisma";
import { ORPCError, os } from "@orpc/server";
import { Airport } from "~/prisma/generated/browser";

import {
	AirportDefaultArgs,
	AirportFindFirstArgs,
	AirportGetPayload
} from "~/prisma/generated/models";

const Input = z.object({
	iata_code: z.string().min(3).max(3).toUpperCase()
});

type OptionProvider = (iata_code: string) => AirportFindFirstArgs;

export type AirportExtendable<T extends AirportDefaultArgs> = AirportGetPayload<T>;

const defaultOpts: OptionProvider = (iata_code: string): AirportFindFirstArgs => ({
	where: { iata_code }
});

export const injectAirportByIata = <TAirport extends Airport = Airport>(opts: OptionProvider = defaultOpts) => os.middleware<
	{ airport: TAirport },
	z.infer<typeof Input>,
	unknown
>(
	async ({ next }, input) => {
		if (!input.iata_code || input.iata_code.length !== 3) throw new ORPCError("BAD_REQUEST", {
			message: "Missing IATA code"
		});
		
		const airport = await prisma.airport.findFirst(opts(input.iata_code)) as TAirport;
		if (!airport) throw new ORPCError("NOT_FOUND", {
			message: "Airport not found"
		});
		
		return await next({ context: { airport } });
	}
);