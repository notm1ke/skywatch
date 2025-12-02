import { redis } from "~/lib/redis";
import { getRun, start } from "workflow/api";
import { NextRequest, NextResponse } from "next/server";
import { airportRvrCron } from "~/workflows/airport-rvr";

const env = process.env.NODE_ENV;

export const GET = async (req: NextRequest) => {
	const searchParams = req.nextUrl.searchParams;
	if (searchParams.has('once') && env !== 'production') {
		await start(airportRvrCron, [true]);
		return NextResponse.json(
			{ message: "Job scheduled" },
			{ status: 201 }
		);
	}
	
	const instanceId = await redis.get('airspace:rvr:instanceId');
	if (instanceId) {
		const run = getRun(instanceId);
		if (run) return NextResponse.json(
			{ message: "Ok" },
			{ status: 200 }
		);
		
		await redis.del('airspace:rvr:instanceId');
	}
	
	const instance = await start(airportRvrCron, [false]);
	await redis.set('airspace:rvr:instanceId', instance.runId);
	return NextResponse.json(
		{ message: "Job scheduled" },
		{ status: 201 }
	);
}