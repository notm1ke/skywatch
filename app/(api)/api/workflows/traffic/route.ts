import { redis } from "~/lib/redis";
import { getRun, start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";
import { airportTrafficCron } from "~/workflows/airport-traffic";

export const GET = async (req: NextRequest) => {
	if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json(
			{ message: "Unauthorized" },
			{ status: 401 }
		);
	}
	
	const instanceId = await redis.get('airspace:traffic:instanceId');
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
		
		await redis.del('airspace:traffic:instanceId');
	}
	
	const instance = await start(airportTrafficCron);
	await redis.set('airspace:traffic:instanceId', instance.runId);
	return NextResponse.json(
		{ message: "Job scheduled" },
		{ status: 201 }
	);
}