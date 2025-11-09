"use server";

import axios from "axios";

import { redis } from "./redis";
import { okAsync, unwrap } from "./actions";
import { capitalizeFirst, padWithZero, safeParseJson } from "./utils";

export type AirportAdvisory = {
	airportId: string; // IATA
	groundStop?: GroundStopAdvisory;
	groundDelay?: GroundDelayAdvisory;
	airportClosure?: any;
	freeForm?: FreeFormAdvisory;
	arrivalDelay?: DelayAdvisory;
	departureDelay?: DelayAdvisory;
	airportConfig?: AirportConfig;
	deicing?: DeicingAdvisory;
	airportLongName: string;
	latitude: string;
	longitude: string;
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
	iataCode: string;
	eventType: string;
}

type MetricType = "STATUS" | "CENTER" | "FIX";
type StatusMetricNames =
	| "Past Dept Time"
	| "Departing"
	| "EDCT Issued"
	| "Irregular"
	| "Flight Active"
	| "Arrived";

type CenterMetricNames = string;
type FixMetricNames = string;
type MetricName<Metric extends MetricType> = 
	Metric extends "STATUS" ? StatusMetricNames :
	Metric extends "CENTER" ? CenterMetricNames :
	Metric extends "FIX" ? FixMetricNames : never;

export type AirportMetrics = {
	name: string; // IATA
	totalFlightCount: string; // int
	cancelledFlightCount: number;
	dateTime: string;
	month: string;
	day: string;
	year: string;
	defaultAarRate: string; // int
	control: string; // No GDP - ground delay protocol?
	rates: string[];
	fixes: string[]; // waypoints ?
	timeBuckets: Array<{
		day: string; // day of month, zero padded
		time: string; // time of day like 0800
		counts: Array<{
			type: MetricType;
			name: MetricName<MetricType>;
		}>;
		flights: Array<{
			acid: string; // callsign, i.e. UAL1609
			type: string; // IATA aircraft type, i.e. B739
			origin: string; // origin IATA
			destination: string; // destination IATA
			etd: string; // est. time of departure, i.e. A09/0422 (perhaps 11/9 at 0422?)
			ete: string; // est. time en-route (224 means 2h24m or 224m not sure)
			departureCenter: string; // origin airspace center, i.e. ZHU, ZOA
			majorAirline: string; // airline callsign, i.e. UAL
		}>;
	}>;
}

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

export const fetchCompositeAirspaceData = async () => okAsync(
	Promise
		.all([
			// unwrap here rather than in a .then() so ts can infer each individual array item type
			fetchAirspaceStatus().then(unwrap),
			fetchPlannedEvents().then(unwrap)
		])
		.then(([status, planned]) => ({ status, planned })),
	err => err.message
);

const enrichPlannedEvent = (response: RawPlannedEvent): PlannedAirportEvent => {
	const [iataCode, ...eventType] = response.event.split(' ');
	const rawTime = response.time.split('AFTER ')[1];
	
	const hour = (parseInt(rawTime.slice(0, 2)) % 12)
	const time = (hour === 0 ? '12' : padWithZero(hour)) + ':' + rawTime.slice(2) + ' ' + (rawTime < '1200' ? 'am' : 'pm');
	return { time, iataCode, eventType: capitalizeFirst(eventType.join(' ').toLowerCase()) }
}