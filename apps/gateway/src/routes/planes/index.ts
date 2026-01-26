import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";
import { PlaneFilter, PlaneFilterType } from "@/schemas";

import {
	AircraftScalarFieldEnum,
	BoolFilter,
	PlaneRegistrationScalarFieldEnum,
	PlaneRegistrationWhereInput,
	StringFilter
} from "@/prisma/generated/internal/prismaNamespace";

type FilterInput = {
	type: z.ZodType;
	multiple: boolean;
	hasDefault: boolean;
	column?: string;
	table: "aircraft" | "engine" | "planeRegistration";
}

const FilterInputType: Record<z.infer<typeof PlaneFilterType>, FilterInput> = {
	n_number: {
		type: z.string(),
		multiple: false,
		hasDefault: false,
		table: "planeRegistration"
	},
	status: {
		type: z.string(),
		multiple: true,
		hasDefault: true,
		table: "planeRegistration",
	},
	manufacturer: {
		type: z.string(),
		multiple: false,
		hasDefault: false,
		table: "aircraft",
	},
	model: {
		type: z.string(),
		multiple: true,
		hasDefault: false,
		table: "aircraft",
	},
	aircraft_type: {
		type: z.string(),
		multiple: true,
		hasDefault: true,
		table: "planeRegistration",
	},
	engine_type: {
		type: z.string(),
		multiple: true,
		hasDefault: true,
		table: "planeRegistration",
	},
	owner_name: {
		type: z.string(),
		multiple: false,
		hasDefault: false,
		table: "planeRegistration",
	},
	fractionally_owned: {
		type: z.coerce.boolean(),
		multiple: false,
		hasDefault: true,
		table: "planeRegistration",
	}
}

const search = base
	.input(z.object({
		cursor: z.string().optional(),
		filters: z.array(PlaneFilter).default([]),
		perPage: z.number().min(1).max(100).optional().default(100)
	}))
	.handler(async ({ input: { cursor, filters, perPage } }) => {
		const sortKey = cursor
			? Buffer.from(cursor, 'base64').toString('utf-8')
			: undefined;
		
		const where = applyFilters(filters);
		const [count, results] = await prisma.$transaction([
			prisma.planeRegistration.count({ where }),
			prisma.planeRegistration.findMany({
				include: {
					aircraft: true,
					engine: true
				},
				where: {
					...where,
					n_number: {
						gt: sortKey
					}
				},
				take: perPage
			})	
		])
		
		if (!results.length) return {
			results: [],
			count: 0,
			nextPage: null
		};
		
		const nextCursor = results.at(-1)!.n_number;
		return {
			results,
			count,
			nextPage: Buffer
				.from(nextCursor)
				.toString('base64')
		}
	});

const applyFilters = (filters: z.infer<typeof PlaneFilter>[]): PlaneRegistrationWhereInput => {
	const native = Array<PlaneRegistrationWhereInput>();
	console.log(filters);
	for (const filter of filters) {
		switch (filter.type) {
			case "n_number": {
				let regInput = filter.input?.at(0)!;
				if (!regInput) break;
				if (regInput.toLowerCase().startsWith("n"))
					regInput = regInput.slice(1);
				
				native.push({
					n_number: {
						startsWith: regInput,
						mode: "insensitive"
					}
				});
				break;
			}
			case "status":
				native.push({
					status: {
						in: filter.input,
						mode: "insensitive"
					}
				});
				break;
			case "aircraft_type":
				native.push({
					aircraft_type: {
						in: filter.input,
						mode: "insensitive"
					}
				});
				break;
			case "engine_type":
				native.push({
					engine_type: {
						in: filter.input,
						mode: "insensitive"
					}
				});
				break;
			case "manufacturer":
				native.push({
					aircraft: {
						manufacturer: {
							in: filter.input,
							mode: "insensitive"
						}
					}
				});
				break;
			case "model":
				native.push({
					aircraft: {
						model: {
							in: filter.input,
							mode: "insensitive"
						}
					}
				});
				break;
			case "owner_name":
				native.push({
					owner_name: {
						in: filter.input,
						mode: "insensitive"
					}
				});
				break;
			case "fractionally_owned":
				native.push({ fractionally_owned: filter.input.map(item => item === "true").at(0) });
				break;
		}
	}
	
	return {
		AND: native
	};
}

const findByRegistration = base
	.input(z.object({ registration: z.string() }))
	.handler(async ({ input: { registration } }) => prisma
		.planeRegistration
		.findFirst({
			include: {
				aircraft: true,
				engine: true
			},
			where: {
				n_number: {
					equals: registration,
					mode: "insensitive"
				}
			},
		})
		.then(result => {
			if (!result) throw new ORPCError("NOT_FOUND", {
				message: "No matching registrations"
			});
			
			return result;
		})
	);

const filterOptions = base
	.input(z.object({
		type: PlaneFilterType,
		input: z.unknown().optional()
	}))
	.handler(async ({ input: { type, input: rawInput } }) => {
		const typeDef = FilterInputType[type];
		const field = type as PlaneRegistrationScalarFieldEnum | AircraftScalarFieldEnum;
		if (!rawInput && !typeDef.hasDefault) throw new ORPCError("BAD_REQUEST", {
			message: `Filter type "${type}" expects input`
		});
		
		const input = typeDef.type.safeParse(rawInput);
		if (rawInput && !input.success) throw new ORPCError("BAD_REQUEST", {
			message: `Invalid input for filter type "${type}"`
		});
		
		// safe to grab distinct
		if (!input.data && typeDef.hasDefault) {
			return await (prisma as any)[typeDef.table]
				.findMany({ select: { [field]: true }, distinct: [field] })
				.then((results: any[]) => results.map(result => result[field]?.toString() ?? "")) as string[];
		}
		
		// requires searching
		return await (prisma as any)[typeDef.table]
			.findMany({
				distinct: [field],
				select: { [field]: true },
				where: { [field]: generateFieldQuery(type, input.data) },
				take: 25
			})
			.then((results: any[]) => results.map(result => result[field]?.toString() ?? "")) as string[];
	});

const generateFieldQuery = (field: z.infer<typeof PlaneFilterType>, input: unknown): StringFilter | BoolFilter => {
	const opts = FilterInputType[field];
	switch (opts.type.def.type) {
		case "string": return { startsWith: input as string, mode: "insensitive" } as StringFilter;
		case "boolean": return { equals: input as boolean } as BoolFilter;
		default: throw new Error("Unsupported");
	}
}

export const planesRouter = {
	planes: { search, findByRegistration, filterOptions }
}
