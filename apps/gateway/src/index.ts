import { Hono } from "hono";
import { router } from "./routes";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

const app = new Hono();

const handler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error("Uncaught error in procedure:", error)
		}),
	],
});

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