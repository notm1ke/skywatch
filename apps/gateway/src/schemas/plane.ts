import { PlaneRegistrationGetPayload } from "@/prisma/generated/models";

export type PlaneRegistration = PlaneRegistrationGetPayload<{
	include: {
		aircraft: true,
		engine: true
	}
}>;