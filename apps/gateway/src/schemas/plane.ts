import { z } from "zod/v4";
import { PlaneRegistrationGetPayload } from "@/prisma/generated/models";

export type PlaneRegistration = PlaneRegistrationGetPayload<{
	include: {
		aircraft: true,
		engine: true
	}
}>;

export const PlaneFilterType = z.enum([
	"n_number",
	"status",
	"manufacturer",
	"model",
	"aircraft_type",
	"engine_type",
	"owner_name",
	"fractionally_owned"
]);

export const PlaneFilter = z.object({
	type: PlaneFilterType,
	input: z.array(z.string())
});

export const PlaneAdsbResponse = z.object({
	ac: z.array(z.object({
		hex: z.string(),
		type: z.string(),
		flight: z.string(), // callsign
		r: z.string(), // registration
		t: z.string(), // iata aircraft type
		desc: z.string().optional(), // aircraft mfg + model
		ownOp: z.string().optional(), // operator name (i.e. UNITED AIRLINES INC)
		year: z.string().optional(), // airworthy year
		alt_baro: z.number(), // barometric alt
		alt_geom: z.number(), // gps (geometric) alt
		gs: z.number(), // ground speed
		ias: z.number().optional(), // indicated airspeed
		tas: z.number().optional(), // true airspeed
		mach: z.number().optional(), // mach number
		oat: z.number().optional(), // outside air temp
		tat: z.number().optional(), // total air temp
		track: z.number(), // track heading in deg 
		track_rate: z.number().optional(), // rate of track heading change deg/sec
		roll: z.number().optional(), // bank angle in deg
		mag_heading: z.number().optional(), // heading relative to magnetic north
		true_heading: z.number().optional(), // heading relative to true north
		baro_rate: z.number(), // vertical speed based on air pressure ft/min
		geom_rate: z.number().optional(), // vertical speed based on gps ft/min
		squawk: z.string(), // transponder squawk code
		emergency: z.string(), // emergency status or `none`
		category: z.string(), // weight category
		nav_qnh: z.number(), // altimeter setting in hPa
		nav_altitude_mcp: z.number(), // autopilot set alt
		nav_altitude_fms: z.number().optional(), // flight mgmt system managed alt
		nav_heading: z.number().optional(), // autopilot set heading
		lat: z.number(), // aircraft latitude
		lon: z.number(), // aircraft longitude
		nic: z.number(), // nav integrity category (higher is better)
		rc: z.number(), // radius of containment (confidence radius in m)
		seen_pos: z.number(), // seconds since last valid position update
		version: z.number(), // adsb version
		nic_baro: z.number(), // barometric integrity
		nac_p: z.number(), // nav accuracy (gps position)
		nac_v: z.number(), // speed accuracy
		sil: z.number(), // source integrity level
		sil_type: z.string(), // SIL probability - per hour/per sample
		gva: z.number(), // geometric vertical accuracy
		sda: z.number(), // sys design assurance
		alert: z.number(), // alert status
		spi: z.number(), // special position indicator (atc ident)
		mlat: z.array(z.any()), // fields if position computed via mlat
		tisb: z.array(z.any()), // tis-b data if applicable
		messages: z.number(), // message count recvd from aircraft
		seen: z.number(), // seconds since any message recvd
		rssi: z.number(), // signal strength in dBFS
	})),
	msg: z.string(),
	now: z.number(),
	total: z.number(),
	ctime: z.number(),
	ptime: z.number()
})

export const JetApiResponse = z.object({
	JetPhotos: z.object({
		Reg: z.string(),
		Images: z.array(z.object({
			Image: z.string(),
			Link: z.string(),
			Thumbnail: z.string(),
			DateTaken: z.string(),
			DateUploaded: z.string(),
			Location: z.string(),
			Photographer: z.string(),
			Aircraft: z.string(),
			Serial: z.string(),
			Airline: z.string()
		}))
	}),
	FlightRadar: z.object({
		Aircraft: z.string(),
		Airline: z.string(),
		Operator: z.string(),
		TypeCode: z.string(),
		AirlineCode: z.string(),
		OperatorCode: z.string(),
		ModeS: z.string(),
		Flights: z.array(z.object({
			Date: z.string(),
			From: z.string(),
			To: z.string(),
			Flight: z.string(),
			FlightTime: z.string(),
			STD: z.string(),
			ATD: z.string(),
			STA: z.string(),
			Status: z.string()
		}))
	})
})