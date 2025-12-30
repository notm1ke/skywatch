import { router } from "@/routes";
import { RouterClient } from "@orpc/server";

export type GatewayRouter = RouterClient<typeof router>;