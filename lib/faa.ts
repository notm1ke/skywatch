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
	arrivalDelay?: any;
	departureDelay?: any;
	airportConfig?: AirportConfig;
	deicing?: any;
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

const AIRSPACE_STATUS_CACHE_KEY = 'airspace:status';
const PLANNED_EVENTS_CACHE_KEY = 'airspace:planned';

export const fetchAirspaceStatus = async () => {
	return okAsync(redis
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
}

export const fetchPlannedEvents = async () => {
	return okAsync(redis
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
}

export const fetchCompositeAirspaceData = async () => okAsync(
	Promise
		.all([
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