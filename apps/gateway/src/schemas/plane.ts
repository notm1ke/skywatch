import { z } from "zod/v4";
import { PlaneRegistrationGetPayload } from "@/prisma/generated/models";

export type PlaneRegistration = PlaneRegistrationGetPayload<{
	include: {
		aircraft: true,
		engine: true
	}
}>;

export const PlaneFilterType = z.enum(["n_number", "status", "manufacturer", "model", "aircraft_type", "engine_type", "owner_name", "fractionally_owned"]);

export const PlaneFilter = z.object({
	type: PlaneFilterType,
	input: z.array(z.string())
});