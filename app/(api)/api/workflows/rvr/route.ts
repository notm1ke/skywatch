import { redis } from "~/lib/redis";
import { getRun, start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";
import { airportRvrCron } from "~/workflows/airport-rvr";

export const GET = async (req: NextRequest) => {
	if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json(
			{ message: "Unauthorized" },
			{ status: 401 }
		);
	}
	
	const instanceId = await redis.get('airspace:rvr:instanceId');
	if (instanceId) {
		const run = getRun(instanceId);
		if (run) {
			const status = await run.status;
			if (status === "running") return NextResponse.json(
				{ message: "Workflow currently running" },
				{ status: 200 }
			);
			
			if (status === "pending" || status === "paused") await run.cancel();
		}
		
		await redis.del('airspace:rvr:instanceId');
	}
	
	const instance = await start(airportRvrCron);
	await redis.set('airspace:rvr:instanceId', instance.runId);
	return NextResponse.json(
		{ message: "Job invoked" },
		{ status: 201 }
	);
}