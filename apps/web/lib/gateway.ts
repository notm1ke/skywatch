import { createClient } from "@skywatch/gateway";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL!;
if (!gatewayUrl) throw new Error('Gateway URL not configured.');

export const gateway = createClient(gatewayUrl);
export const orpc = createTanstackQueryUtils(gateway);