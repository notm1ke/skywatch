import { z } from "zod/v4";

import {
	AirportAdvisory,
	InterruptionEvent,
	PlannedAirportEvent,
	Tfr
} from "@skywatch/gateway/schemas";

export type AirportAdvisory = z.infer<typeof AirportAdvisory>;
export type PlannedAirportEvent = z.infer<typeof PlannedAirportEvent>;
export type Tfr = z.infer<typeof Tfr>;
export type InterruptionEvent = z.infer<typeof InterruptionEvent>;