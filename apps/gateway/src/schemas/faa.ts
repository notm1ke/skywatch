import { z } from "zod/v4";
import { GeoJson } from "./geo";

export const AirportStatus = z.enum([
	"normal",
	"ground_stop",
	"ground_delay",
	"ops_delay",
	"airport_closure",
	"freeform",
	"deicing",
]);

export const AirportClosureAdvisory = z.object({
	id: z.string(),
	airportId: z.string(), // IATA
	createdAt: z.string(),
	updatedAt: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	simpleText: z.string(),
	text: z.string(),
	notamNumber: z.number(),
	issuedDate: z.string(),
});

export const GroundDelayAdvisory = z.object({
	id: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	sourceTimeStamp: z.string(),
	airportId: z.string(), // IATA
	impactingCondition: z.string(),
	avgDelay: z.number(), // minutes
	maxDelay: z.number(), // minutes
	center: z.string(),
	advisoryUrl: z.string(),
	departureScope: z.any(),
	includedFacilities: z.array(z.string()),
	fuelFlowAdvisoryDelayTime: z.object({
		id: z.string(),
		controlElement: z.string(), // IATA
		delayProgramType: z.string(), // GDP (ground delay program?) then maybe GSP (ground stop program)
		startTime: z.string(),
		endTime: z.string(),
		dasDelays: z.array(z.object({
			delayTimeAmount: z.string(), // datetime
			dasDelay: z.array(z.object({
				delay: z.number(),
				seq: z.number()
			})),
			sourceTimeStamp: z.string(),
			createdAt: z.string(),
			updatedAt: z.string()
		})),
	}),
	includedFlights: z.string(),
	fadtParamType: z.string(), // GDP/GSP
	gsCancelReceivedTs: z.string().nullable(), // datetime?
	gsCancelSourceTs: z.string().nullable(), // datetime?
	compression: z.boolean(),
	blanket: z.boolean()
});

export const GroundStopAdvisory = z.object({
	id: z.string(),
	airportId: z.string(),
	createdAt: z.string(),
	sourceTimeStamp: z.string(),
	updatedAt: z.string(),
	impactingCondition: z.string(),
	programExpirationTime: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	center: z.string(),
	advisoryUrl: z.string(),
	includedFacilities: z.array(z.string()),
	includedFlights: z.string(),
	probabilityOfExtension: z.string()
});

export const FreeFormAdvisory = z.object({
	id: z.string(),
	airportId: z.string(), // IATA
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
	startTime: z.string(),
	endTime: z.string(),
	simpleText: z.string(),
	text: z.string(),
	notamNumber: z.number(),
	issuedDate: z.string()
});

export const DeicingAdvisory = z.object({
	id: z.string(),
	airportId: z.string(), // IATA
	createdAt: z.string(),
	updatedAt: z.string(),
	eventTime: z.string(),
	expTime: z.string()
});

export const DelayAdvisory = z.object({
	airportId: z.string(),
	reason: z.string(),
	arrivalDeparture: z.object({
		type: z.string(),
		min: z.string(), // fmt time string i.e. 1 hour and 1 minute
		max: z.string(), // fmt time string i.e. 1 hour and 1 minute
		trend: z.string()
	}),
	updateTime: z.string(),
	averageDelay: z.string(),
	trend: z.string()
});

export const AirportConfig = z.object({
	id: z.string(),
	airportId: z.string(), // IATA
	createdAt: z.string(),
	sourceTimeStamp: z.string(),
	arrivalRate: z.number(),
	arrivalRunwayConfig: z.string(),
	departureRunwayConfig: z.string(),
});

export const AirportAdvisory = z.object({
	airportId: z.string(),
	groundStop: GroundStopAdvisory.nullable(),
	groundDelay: GroundDelayAdvisory.nullable(),
	airportClosure: AirportClosureAdvisory.nullable(),
	freeForm: FreeFormAdvisory.nullable(),
	arrivalDelay: DelayAdvisory.nullable(),
	departureDelay: DelayAdvisory.nullable(),
	airportConfig: AirportConfig.nullable(),
	deicing: DeicingAdvisory.nullable(),
	airportLongName: z.string(),
	latitude: z.string(),
	longitude: z.string(),
});

export const RawPlannedEvent = z.object({
	time: z.string(),
	event: z.string()
});

export const OperationsPlanResponse = z.object({
	link: z.string(),
	terminalPlanned: z.array(RawPlannedEvent),
	enRoutePlanned: z.array(RawPlannedEvent)
});

export const PlannedAirportEvent = z.object({
	time: z.string(),
	forecastType: z.enum([
		"until",
		"after"
	]),
	iataCode: z.string(),
	eventType: z.string()
});

export const CancellationStats = z.object({
	total: z.number(),
	cancelled: z.number(),
	interrupted: z.number()
});

export const Tfr = z.object({
	notam_id: z.string(),
	facility: z.string(),
	state: z.string(),
	type: z.string(),
	dscription: z.string(),
	mod_date: z.string(),
	mod_abs_time: z.string(),
	is_new: z.string(),
	gid: z.string().nullable()
}); // todo: add geo feature to this object

export const TfrText = z.object({
	text: z.string()
})

export const TfrGeoFeatureMetadata = z.object({
	GID: z.number(),
	CNS_LOCATION_ID: z.string(),
	NOTAM_KEY: z.string(),
	TITLE: z.string(),
	LAST_MODIFICATION_DATETIME: z.string(),
	STATE: z.string(),
	LEGAL: z.string()
});

export const TfrGeoJson = GeoJson(TfrGeoFeatureMetadata);

export const TfrResponse = z.object({
	tfrs: z.array(Tfr),
	geo: TfrGeoJson
});