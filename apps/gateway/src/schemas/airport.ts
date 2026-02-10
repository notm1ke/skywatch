import { z } from "zod/v4";
import { AirportGetPayload } from "@/prisma/generated/models";

export type AirportWithJoins = AirportGetPayload<{
	include: {
		airline_hubs: true,
		frequencies: true,
		navaids: true,
		runways: true
	}
}>;

export const AirportAtisType = z.enum(["departures", "arrivals", "combined"]);

export const AirportAtis = z.object({
	type: AirportAtisType,
	time: z.string(),
	atis: z.string()
});

export const CloudCover = z.enum([
	"SKC", // clear sky - manual station
	"CLR", // clear sky - automated station
	"FEW", // few clouds
	"SCT", // scattered clouds
	"BKN", // broken clouds
	"OVC", // overcast
	"OVX", // overcast
	"VV"   // vertical visibility (completely obscured)
]);

export const FlightCategory = z.enum([
	"VFR", // visual flight rules
	"MVFR", // marginal visual flight rules
	"LIFR", // low instrument flight rules
	"IFR", // instrument flight rules
	"UNK"  // unknown
]);

export const AirportMetar = z.object({
	icaoId: z.string(),
	receiptTime: z.string(),
	reportTime: z.string(),
	obsTime: z.number(),
	temp: z.number(), // celcius
	dewp: z.number(), // celcius
	wdir: z.union([z.coerce.number(), z.literal("VRB")]), // wind direction (deg) or variable
	wspd: z.number(), // wind speed (kts)
	wgst: z.number().nullish(), // wind gust (kts)
	visib: z.union([z.string(), z.number()]), // "n+" or just n (statute miles)
	altim: z.number(), // altimeter (hPa)
	slp: z.number().nullish(), // sea-level pressure (hPa)
	qcField: z.number(), // 1-5 quality control score
	wxString: z.string().nullish(), // severe weather string (i.e. -FZRA PL)
	maxT: z.number().nullish(),
	minT: z.number().nullish(),
	maxT24: z.number().nullish(),
	minT24: z.number().nullish(),
	presTend: z.number().nullish(), // 3hr pressure tendency (altimeter change)
	precip: z.number().nullish(), // precipitation (in)
	pcp3hr: z.number().nullish(), // precip 3hr (in)
	pcp6hr: z.number().nullish(), // precip 6hr (in)
	snow: z.number().nullish(),
	metarType: z.string(), // METAR or SPECI
	rawOb: z.string(), // raw metar string
	lat: z.number(), // station latitude
	lon: z.number(), // station longitude
	elev: z.number(), // station elevation (ft)
	name: z.string(), // station name
	cover: CloudCover, // overall cloud conditions
	clouds: z.array(z.object({
		cover: CloudCover, // cloud conditions
		base: z.number() // base altitude
	})),
	fltCat: FlightCategory, // current flight operations 
	rawTaf: z.string() // raw terminal aerodrome forecast (taf) string
});

export const TsaWaitTimes = z.object({
	airport_code: z.string(),
	airport_name: z.string(),
	count: z.number(),
	data: z.array(z.object({
		day: z.string(),
		hour: z.string(),
		max_standard_wait: z.string(),
		updated: z.string()
	}))
});

export const RvrTrend = z.enum(["increasing", "decreasing", "steady"]);

export const RvrProbeType = z.enum([
	"touchdown",
	"midpoint",
	"rollout",
]);

export const RvrProbeValue = z.object({
	visibilityFt: z.number(),
	trend: RvrTrend
});

export const RvrProbe = z.object({
	name: z.string(),
	touchdown: RvrProbeValue.nullish(),
	midpoint: RvrProbeValue.nullish(),
	rollout: RvrProbeValue.nullish(),
	
	// -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighing
	illumination: z.object({
		edge: z.number().nullish(),
		center: z.number().nullish()
	})
})

export const Rvr = z.object({
	iata: z.string(),
	updatedAt: z.number(),
	runways: z.array(RvrProbe)
});

export const IncidentType = z.enum([
	"airport_closure",
	"ground_stop",
	"ground_delay",
	"dual_delay",
	"arrival_delay",
	"departure_delay"
]);

export const IncidentIndication = z.union([
	IncidentType,
	z.literal("normal")
]);

export const IncidentHistoryEntry = z.object({
	dt: z.date(),
	indicator: IncidentIndication,
	incidents: z.array(z.object({
		event_type: IncidentType,
		event_id: z.string(),
		observed_at: z.date(),
		resolved_at: z.date().nullish()
	}))
});

export const IncidentHistory = z.array(IncidentHistoryEntry);