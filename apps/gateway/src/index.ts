import { z } from "zod/v4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { router } from "./routes";
import { corsOrigin } from "./utils";
import { RPCHandler } from "@orpc/server/fetch";
import { onError, ORPCError, ValidationError } from "@orpc/server";

const app = new Hono();

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			if (
				error instanceof ORPCError
				&& error.code === 'BAD_REQUEST'
				&& error.cause instanceof ValidationError
			) {
				const zodError = new z.ZodError(error.cause.issues as z.core.$ZodIssue[])
				console.log("Input validation error(s):", zodError);
				throw new ORPCError('INPUT_VALIDATION_FAILED', {
					status: 400,
					message: z.prettifyError(zodError),
					data: z.flattenError(zodError),
					cause: error.cause,
				})
			}

			if (
				error instanceof ORPCError
				&& error.code === 'INTERNAL_SERVER_ERROR'
				&& error.cause instanceof ValidationError
			) {
				throw new ORPCError('OUTPUT_VALIDATION_FAILED', {
					cause: error.cause,
				})
			}
			
			console.error("Uncaught error in procedure:", error)
			if (typeof error === "object" && error && "data" in error) {
				console.log(error.data)
			}
		}),
	],
});

app.use('*', cors({
	origin: corsOrigin,
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization'],
	exposeHeaders: ['Content-Length', 'Content-Range', 'Transfer-Encoding'],
	credentials: true,
}));

app.use('/rpc/*', async (c, next) => {
	const { matched, response } = await handler.handle(c.req.raw, {
		prefix: '/rpc',
		context: {} 
	});

	if (matched) return c.newResponse(
		response.body,
		response
	);

	await next();
});

export default app;