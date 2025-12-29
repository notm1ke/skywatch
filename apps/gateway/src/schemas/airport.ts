import { z } from "zod/v4";

export const AirportAtis = z.array(z.object({
	type: z.enum(["departures", "arrivals", "combined"]),
	time: z.string(),
	atis: z.string()
}));

export const CloudCover = z.enum([
	"SKC", // clear sky - manual station
	"CLR", // clear sky - automated station
	"FEW", // few clouds
	"SCT", // scattered clouds
	"BKN", // broken clouds
	"OVC", // overcast
	"VV"   // vertical visibility (completely obscured)
]);

export const AirportMetar = z.object({
	icaoId: z.string(),
	receiptTime: z.string(),
	reportTime: z.string(),
	obsTime: z.string(),
	temp: z.number(), // celcius
	dewp: z.number(), // celcius
	wdir: z.number(), // wind direction (deg)
	wspd: z.number(), // wind speed (kts)
	wgst: z.number().nullable(), // wind gust (kts)
	visib: z.union([z.string(), z.number()]), // "n+" or just n (statute miles)
	altim: z.number(), // altimeter (hPa)
	slp: z.number(), // sea-level pressure (hPa)
	qcField: z.number(), // 1-5 quality control score
	wxString: z.string().nullable(), // severe weather string (i.e. -FZRA PL)
	maxT: z.number().nullable(),
	minT: z.number().nullable(),
	maxT24: z.number().nullable(),
	minT24: z.number().nullable(),
	presTend: z.number().nullable(), // 3hr pressure tendency (altimeter change)
	precip: z.number().nullable(), // precipitation (in)
	pcp3hr: z.number().nullable(), // precip 3hr (in)
	pcp6hr: z.number().nullable(), // precip 6hr (in)
	snow: z.number().nullable(),
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
	fltCat: z.enum([ // current flight operations 
		"VFR",  // visual flight rules
		"MVFR", // marginal vfr
		"IFR",  // instrument flight rules
		"LIFR"  // low ifr (severely restricted) 
	]),
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

export const RvrProbeValue = z.object({
	visibilityFt: z.number(),
	trend: RvrTrend
});

export const RvrProbe = z.object({
	name: z.string(),
	touchdown: RvrProbeValue.optional(),
	midpoint: RvrProbeValue.optional(),
	rollout: RvrProbeValue.optional(),
	
	// -1 = Fault, 0 = Off, 5 = Maximum, undefined = No Lighing
	illumination: z.object({
		edge: z.number().optional(),
		center: z.number().optional()
	})
})

export const Rvr = z.object({
	iata: z.string(),
	updatedAt: z.number(),
	runways: z.array(RvrProbe)
});