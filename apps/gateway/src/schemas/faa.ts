import { z } from "zod/v4";
import { WaypointGetPayload } from "@/prisma/generated/models";

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
	includedFacilities: z.array(z.string()).nullable(),
	fuelFlowAdvisoryDelayTime: z.object({
		id: z.string(),
		controlElement: z.string(), // IATA
		delayProgramType: z.string(), // GDP (ground delay program?) then maybe GSP (ground stop program)
		startTime: z.string(),
		endTime: z.string(),
		sourceTimeStamp: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		dasDelays: z.object({
			delayTimeAmount: z.string(), // datetime
			dasDelay: z.array(z.object({
				delay: z.number(),
				seq: z.number()
			})),
		})
	}),
	includedFlights: z.string(),
	fadtParamType: z.string(), // GDP/GSP
	gsCancelReceivedTs: z.string().nullish(), // datetime?
	gsCancelSourceTs: z.string().nullish(), // datetime?
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
	createdAt: z.string().nullish(),
	updatedAt: z.string().nullish(),
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
	groundStop: GroundStopAdvisory.nullish(),
	groundDelay: GroundDelayAdvisory.nullish(),
	airportClosure: AirportClosureAdvisory.nullish(),
	freeForm: FreeFormAdvisory.nullish(),
	arrivalDelay: DelayAdvisory.nullish(),
	departureDelay: DelayAdvisory.nullish(),
	airportConfig: AirportConfig.nullish(),
	deicing: DeicingAdvisory.nullish(),
	airportLongName: z.string(),
	latitude: z.string(),
	longitude: z.string(),
});

export const AirspaceAdvisory = z.object({
	advisoryUrl: z.string(),
	advisoryNumber: z.number(),
	facilities: z.array(z.string()).min(1),
	date: z.string(),
	brief: z.string(),
	createdAt: z.string()
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
	iataCode: z.array(z.string()),
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
	description: z.string(),
	mod_date: z.string(),
	mod_abs_time: z.string(),
	is_new: z.string(),
	gid: z.string().nullish()
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

const PolygonCoordinate = z.array(z.array(z.array(z.number()).length(2)));

export const TfrGeoJson = z.object({
	type: z.literal("FeatureCollection"),
	features: z.array(z.object({
		type: z.literal("Feature"),
		id: z.string().optional(),
		properties: TfrGeoFeatureMetadata,
		geometry_name: z.string().optional(),
		geometry: z.object({
			type: z.literal("Polygon"),
			coordinates: PolygonCoordinate
		})
	}))
});

export const TfrResponse = z.object({
	tfrs: z.array(Tfr),
	geo: TfrGeoJson
});

export type Waypoint = WaypointGetPayload<{}>;

export const WaypointUseType = [
	"RADAR",
	"WP",
	"CN",
	"MW",
	"NRS",
	"VFR",
	"RP",
	"MR"
] as const;

export type WaypointUseType = typeof WaypointUseType[number];

export const WaypointUseLocalizations: Record<string, string> = {
	RADAR: "Radar-only",
	WP: "Waypoint",
	CN: "Computer Navigation",
	MW: "Military Waypoint",
	NRS: "Nav-Ref Grid Point",
	VFR: "Visual Aid",
	RP: "Reporting Point",
	MR: "Military Reporting Point"
};

export const WaypointChartLocalizations: Record<string, string> = {
	"AREA": "Enroute Area",
	"CONTROLLER": "Air Route Traffic Control (ARTCC)",
	"CONTROLLER LOW": "ARTCC Low Altitude",
	"CONTROLLER HIGH": "ARTCC High Altitude",
	"ENROUTE LOW": "IFR Enroute Low Altitude",
	"ENROUTE HIGH": "IFR Enroute High Altitude",
	"GULF COAST VFR CHART": "Gulf of America VFR",
	"HELICOPTER ROUTE": "Helicopter Route",
	"IAP": "Instrument Approach Procedure",
	"IFR GOA VERTICAL FLT": "Gulf of America IFR Vertical Reference",
	"MILITARY IAP": "Military IAP",
	"MILITARY STAR": "Military STAR",
	"MILITARY SID": "Military SID",
	"NORTH ATLANTIC ROUTE": "Atlantic Tracks High Altitude",
	"NORTH PACIFIC ROUTE": "Pacific Tracks High Altitude",
	"NOT REQUIRED": "Not Published",
	"PRIVATE IAP": "Private IAP",
	"SECTIONAL": "Sectional Aero",
	"SID": "Standard Instrument Departure",
	"SPECIAL DP": "Special Departure Procedure",
	"SPECIAL IAP": "Special IAP",
	"STAR": "Standard Terminal Arrival Route",
	"WESTERN ATLANTIC ROUTE": "WATRS",
	"VFR FLYWAY PLANNING": "VFR Flyway Planning",
	"VFR TERMINAL AREA": "Terminal Area",
}

const PointCoordinate = z.array(z.number()).length(2);

export const WaypointFeatureMetadata = z.object({
	waypoint_id: z.string(),
	waypoint_use_code: z.string(),
	icao_region_code: z.string(),
	state_code: z.string(),
	charts: z.array(z.string()),
	charting_remark: z.string(),
	artcc_id_high: z.string(),
	artcc_id_low: z.string(),
	min_reception_alt: z.number(),
	special_use_flag: z.boolean(),
	catch_flag: z.boolean(),
	pitch_flag: z.boolean(),
	compulsory: z.string()
});

export const WaypointGeoJson = z.object({
	type: z.literal("FeatureCollection"),
	features: z.array(z.object({
		type: z.literal("Feature"),
		properties: WaypointFeatureMetadata,
		geometry: z.object({
			type: z.literal("Point"),
			coordinates: PointCoordinate
		})
	}))
});

export const WaypointWithDynamic = z.object({
	...WaypointFeatureMetadata,
	airports: z.array(z.string())
})
