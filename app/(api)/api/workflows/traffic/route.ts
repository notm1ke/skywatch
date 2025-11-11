import { redis } from "~/lib/redis";
import { getRun, start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";
import { airportTrafficCron } from "~/workflows/airport-traffic";

const env = process.env.NODE_ENV;

export const GET = async (req: NextRequest) => {
	const searchParams = req.nextUrl.searchParams;
	if (searchParams.has('once') && env !== 'production') {
		await start(airportTrafficCron, [true]);
		return NextResponse.json(
			{ message: "Job scheduled" },
			{ status: 201 }
		);
	}
	
	const instanceId = await redis.get('airspace:traffic:instanceId');
	if (instanceId) {
		const run = getRun(instanceId);
		if (run) return NextResponse.json(
			{ message: "Ok" },
			{ status: 200 }
		);
		
		await redis.del('airspace:traffic:instanceId');
	}
	
	const instance = await start(airportTrafficCron, [false]);
	await redis.set('airspace:traffic:instanceId', instance.runId);
	return NextResponse.json(
		{ message: "Job scheduled" },
		{ status: 201 }
	);
}