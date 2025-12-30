import { RPCLink } from "@orpc/client/fetch";
import { createORPCClient } from "@orpc/client";
import { GatewayRouter } from "@skywatch/gateway/schemas";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL!;
if (!gatewayUrl) throw new Error('Gateway URL not configured.');

const link = new RPCLink({ url: gatewayUrl });
export const gateway = createORPCClient<GatewayRouter>(link);
export const orpc = createTanstackQueryUtils(gateway);