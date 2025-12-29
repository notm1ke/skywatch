import { router } from "~/routes";
import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";

export const createClient = (url: string) => {
	const link = new RPCLink({ url });
	return createORPCClient(link) as RouterClient<typeof router>;
}