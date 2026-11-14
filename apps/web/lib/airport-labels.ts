/** Shared airport label tables, used by the airports filter sidebar and the airport reference tab. */

export const ATC_TYPE_ORDER = ["UNCONTROLLED", "NON-ATCT", "ATCT", "ATCT-A/C", "ATCT-RAPCON", "ATCT-RATCF", "ATCT-TRACON"];

export const ATC_TYPE_LABELS: Record<string, string> = {
	"UNCONTROLLED": "Uncontrolled",
	"NON-ATCT":     "No Tower",
	"ATCT":         "Tower",
	"ATCT-A/C":     "Tower + Appr Ctrl",
	"ATCT-RAPCON":  "Tower + Radar Appr Ctrl",
	"ATCT-RATCF":   "Tower + Radar ATC Facil",
	"ATCT-TRACON":  "Tower + Term Radar Appr Ctrl",
};

/**
 * Keys here double as filter keys in the airports sidebar. Don't add display-only entries here
 * (e.g. Global Entry enrollment): the filter would offer an option it can't apply.
 */
export const CAPABILITY_LABELS: Record<string, string> = {
	atis: "ATIS",
	cbp: "CBP Port of Entry",
	globalEntry: "CBP Global Entry",
	mpc: "CBP Mobile Passport Control",
	precheck: "TSA PreCheck",
	clear: "CLEAR+",
	rvr: "Runway Visual Range",
};
