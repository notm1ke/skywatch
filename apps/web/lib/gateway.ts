import { createClient } from "@skywatch/gateway";

const gateway = process.env.GATEWAY_URL!;
if (!gateway) throw new Error('Gateway URL not configured.');

export const client = createClient(gateway);