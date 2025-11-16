"use server";

import axios from "axios";

import { redis } from "./redis";
import { prisma } from "./prisma";
import { okAsync, raise, unwrap } from "./actions";

import {
	capitalizeFirst,
	formatFaaTime,
	safeParseJson
} from "./utils";

export type AirportStatus =
	| "normal"
	| "ground_stop"
	| "ground_delay"
	| "ops_delay"
	| "airport_closure"
	| "freeform"
	| "deicing";

export type AirportAdvisory = {
	airportId: string; // IATA
	groundStop?: GroundStopAdvisory;
	groundDelay?: GroundDelayAdvisory;
	airportClosure?: AirportClosureAdvisory;
	freeForm?: FreeFormAdvisory;
	arrivalDelay?: DelayAdvisory;
	departureDelay?: DelayAdvisory;
	airportConfig?: AirportConfig;
	deicing?: DeicingAdvisory;
	airportLongName: string;
	latitude: string;
	longitude: string;
}

export type AirportClosureAdvisory = {
	id: string;
	airportId: string; // IATA
	createdAt: string;
	updatedAt: string;
	startTime: string;
	endTime: string;
	simpleText: string;
	text: string;
	notamNumber: number;
	issuedDate: string;
}

export type GroundDelayAdvisory = {
	id: string;
	startTime: string;
	endTime: string;
	createdAt: string;
	updatedAt: string;
	sourceTimeStamp: string;
	airportId: string; // IATA
	impactingCondition: string;
	avgDelay: number; // minutes
	maxDelay: number; // minutes
	center: string;
	advisoryUrl: string;
	departureScope?: any;
	includedFacilities: string[];
	fuelFlowAdvisoryDelayTime: {
		id: string;
		controlElement: string; // IATA
		delayProgramType: string; // GDP (ground delay program?) then maybe GSP (ground stop program)
		startTime: string;
		endTime: string;
		dasDelays: {
			delayTimeAmount: string; // datetime
			dasDelay: Array<{
				delay: number;
				seq: number;
			}>;
			sourceTimeStamp: string;
			createdAt: string;
			updatedAt: string;
		}
	};
	includedFlights: string;
	fadtParamType: string; // GDP/GSP
	gsCancelReceivedTs?: string; // datetime?
	gsCancelSourceTs?: string; // datetime?
	compression: boolean;
	blanket: boolean;
}

export type GroundStopAdvisory = {
	id: string;
	airportId: string;
	createdAt: string;
	sourceTimeStamp: string;
	updatedAt: string;
	impactingCondition: string;
	programExpirationTime: string;
	startTime: string;
	endTime: string;
	center: string;
	advisoryUrl: string;
	includedFacilities: string[];
	includedFlights: string;
	probabilityOfExtension: string;
}

export type FreeFormAdvisory = {
	id: string;
	airportId: string; // IATA
	createdAt?: string;
	updatedAt?: string;
	startTime: string;
	endTime: string;
	simpleText: string;
	text: string;
	notamNumber: number;
	issuedDate: string;
}

export type DeicingAdvisory = {
	id: string;
	airportId: string; // IATA
	createdAt: string;
	updatedAt: string;
	eventTime: string;
	expTime: string;
}

export type DelayAdvisory = {
	airportId: string;
	reason: string;
	arrivalDeparture: {
		type: string;
		min: string; // fmt time string i.e. 1 hour and 1 minute
		max: string; // fmt time string i.e. 1 hour and 1 minute
		trend: string;
	};
	updateTime: string;
	averageDelay: string;
	trend: string;
}

export type AirportConfig = {
	id: string;
	airportId: string; // IATA
	createdAt: string;
	sourceTimeStamp: string;
	arrivalRate: number;
	arrivalRunwayConfig: string;
	departureRunwayConfig: string;
}

type OperationsPlanResponse = {
	link: string;
	terminalPlanned: RawPlannedEvent[];
	enRoutePlanned: RawPlannedEvent[];
}

type RawPlannedEvent = {
	time: string;
	event: string;
}

export type PlannedAirportEvent = {
	time: string;
	forecastType: "until" | "after";
	iataCode: string;
	eventType: string;
}

export type CancellationStats = {
	total: number;
	cancelled: number;
	interrupted: number;
}

export type AirspaceType = typeof Airspaces[number];

const Airspaces = [
	'ZAB',
	'ZAU',
	'ZBW',
	'ZDC',
	'ZDV',
	'ZFW',
	'ZHU',
	'ZID',
	'ZJX',
	'ZKC',
	'ZLA',
	'ZLC',
	'ZMA',
	'ZME',
	'ZMP',
	'ZNY',
	'ZOA',
	'ZOB',
	'ZSE',
	'ZTL'
] as const;

const AIRSPACE_STATUS_CACHE_KEY = 'airspace:status';
const PLANNED_EVENTS_CACHE_KEY = 'airspace:planned';

export const fetchAirspaceStatus = async () => okAsync(redis
	.get(AIRSPACE_STATUS_CACHE_KEY)
	.then(response => {
		if (response) return safeParseJson<AirportAdvisory[]>(response);
		return axios
			.get<AirportAdvisory[]>('https://nasstatus.faa.gov/api/airport-events')
			.then(res => res.data)
			.then(data => {
				redis
					.set(AIRSPACE_STATUS_CACHE_KEY, JSON.stringify(data))
					.then(() => redis.expire(AIRSPACE_STATUS_CACHE_KEY, 60 * 5));

				return data;
			})
	}),
	err => err.message
);

export const fetchPlannedEvents = async () => okAsync(redis
	.get(PLANNED_EVENTS_CACHE_KEY)
	.then(response => {
		if (response) return safeParseJson<PlannedAirportEvent[]>(response);
		return axios
			.get<OperationsPlanResponse>('https://nasstatus.faa.gov/api/operations-plan')
			.then(res => res.data)
			.then(data => {
				const enriched = data
					.terminalPlanned
					.map(enrichPlannedEvent);

				redis
					.set(PLANNED_EVENTS_CACHE_KEY, JSON.stringify(enriched))
					.then(() => redis.expire(PLANNED_EVENTS_CACHE_KEY, 60 * 10));

				return enriched;
			})
	}),
	err => err.message
);

const enrichPlannedEvent = (response: RawPlannedEvent): PlannedAirportEvent => {
	const [iataCode, ...eventType] = response.event.split(' ');
	const rawTime = response.time.split(' ')[1];

	return {
		iataCode,
		time: formatFaaTime(rawTime),
		forecastType: response.time.split(' ')[0] === 'AFTER'
			? 'after'
			: 'until',
		eventType: capitalizeFirst(eventType.join(' ').toLowerCase())
	}
}

export const fetchCancellationStats = async () => {
	const marker = await prisma
		.airportTrafficFlow
		.findFirst({
			orderBy: [
				{ year: 'desc' },
				{ month: 'desc' },
				{ day: 'desc' }
			],
			select: {
				year: true,
				month: true,
				day: true
			}
		});

	if (!marker || !marker?.day || !marker?.month || !marker?.year) {
		return raise("No data yet");
	}

	return okAsync(prisma
		.airportTrafficFlow
		.aggregate({
			where: {
				year: { equals: marker.year },
				month: { equals: marker.month },
				day: { equals: marker.day }
			},
			_sum: {
				total_flights: true,
				cancelled_flights: true
			}
		})
		.then(({ _sum: { total_flights, cancelled_flights } }) => ({
			total: total_flights ?? 0,
			cancelled: cancelled_flights ?? 0
		}))
		.then(({ total, cancelled }) => ({
			total,
			cancelled,
			interrupted: cancelled / total
		})));
}

export const fetchCompositeAirspaceData = async () => okAsync(
	Promise
		.all([
			// unwrap here rather than in a .then() so ts can infer each individual array item type
			fetchAirspaceStatus().then(unwrap),
			fetchPlannedEvents().then(unwrap),
		])
		.then(([status, planned]) => ({ status, planned })),
	err => err.message
);
