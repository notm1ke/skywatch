import { z } from "zod/v4";
import { base } from "@/utils";
import { ORPCError } from "@orpc/server";
import { prisma } from "@/services/prisma";

const list = base
	.input(z.object({
		cursor: z.string().optional(),
		perPage: z.number().min(1).max(1000).optional().default(1000)
	}))
	.handler(async ({ input: { cursor, perPage } }) => {
		const sortKey = cursor
			? Buffer.from(cursor, 'base64').toString('utf-8')
			: undefined;
		
		const results = await prisma.planeRegistration.findMany({
			include: {
				aircraft: true,
				engine: true
			},
			where: {
				n_number: {
					gt: sortKey
				}
			},
			take: perPage
		});
		
		if (!results.length) throw new ORPCError("NOT_FOUND", {
			message: "End of data"
		});
		
		const nextCursor = results.at(-1)!.n_number;
		return {
			results,
			nextPage: Buffer
				.from(nextCursor)
				.toString('base64')
		}
	});

export const planesRouter = {
	planes: { list }
}
