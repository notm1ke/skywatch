/**
 * Parsing for the FAA operations plan (nasstatus.faa.gov/api/operations-plan).
 *
 * The feed is free text typed by controllers, so nothing here may assume a fixed vocabulary. Parsing only pulls out
 * what it can recognise (a time, a leading airport list) and always keeps the original text, so a line it doesn't
 * understand still shows up, just with less decoration.
 *
 * Observed shapes (the feed has switched between them):
 *   { time: "UNTIL 0100", event: "-SEA/BFI GROUND STOP/DELAY PROGRAM POSSIBLE" }
 *   { time: "",           event: "UNTIL 0000\t-JFK GROUND STOP/DELAY PROGRAM POSSIBLE" }
 */

export type RawPlannedEntry = { time: string; event: string };

export type ParsedPlannedEntry = {
	/** "until" / "after" when the entry says so */
	forecastType: "until" | "after" | null;
	/** the time as written, in Zulu: "0100Z" */
	time: string | null;
	/** that time as an instant, the next time it occurs (see `resolveZulu`) */
	at: string | null;
	/** the airport (or facility) this row is about, without the leading "-" and other decoration; null if there was none */
	iataCode: string | null;
	/** what is planned, with the time and airports taken out, in sentence case */
	eventType: string;
	/** the original text, untouched apart from whitespace */
	raw: string;
};

const TIME = /\b(UNTIL|AFTER)\s+(\d{4})\b/i;

// a facility code: FAA ids and IATA are 3 characters, ICAO and ARTCCs 4
const FACILITY = /^[A-Z0-9]{3,4}$/;

// stale entries linger in the feed for a while, so a time that passed recently is kept as it is
// rather than assumed to mean the same time tomorrow
const GRACE_MS = 2 * 60 * 60 * 1000;

/** "0100" -> the next 01:00Z at or after (now - grace). Null for anything that isn't a time. */
export const resolveZulu = (hhmm: string, now: Date): Date | null => {
	const hours = parseInt(hhmm.slice(0, 2), 10);
	const minutes = parseInt(hhmm.slice(2), 10);
	if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;

	// Date.UTC rolls 24:00 over to the next day
	const candidate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes);
	const earliest = now.getTime() - GRACE_MS;
	return new Date(candidate < earliest ? candidate + 24 * 60 * 60 * 1000 : candidate);
};

const sentenceCase = (text: string) => {
	const lower = text.toLowerCase();
	return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/** "-SEA/BFI" -> ["SEA", "BFI"]; null unless every piece looks like a facility code */
const parseFacilities = (token: string): string[] | null => {
	const pieces = token
		.replace(/^[^A-Za-z0-9]+/, "") // the leading "-" (and anything like it)
		.split(/[/,]+/)
		.map(piece => piece.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
		.filter(Boolean);

	if (!pieces.length || !pieces.every(piece => FACILITY.test(piece))) return null;
	return [...new Set(pieces)];
};

/**
 * One row per airport: "-SEA/BFI ..." comes back as a SEA row and a BFI row. An entry with no airport we could read
 * comes back as a single row with `iataCode: null`, so it still shows up.
 *
 * @param known airports we know about. A leading "-" is how the feed marks its airports, so those are always taken;
 * without one, a word is only an airport if it's in this set (otherwise "WIND DELAYS" would read WIND as an airport).
 */
export const parsePlannedEntry = (
	entry: RawPlannedEntry,
	now = new Date(),
	known: ReadonlySet<string> = new Set()
): ParsedPlannedEntry[] => {
	const raw = `${entry.time ?? ""} ${entry.event ?? ""}`.replace(/\s+/g, " ").trim();

	const timeMatch = raw.match(TIME);
	const forecastType = timeMatch ? (timeMatch[1].toUpperCase() === "AFTER" ? "after" : "until") : null;
	const at = timeMatch ? resolveZulu(timeMatch[2], now) : null;

	// without the time, what's left is "<airports> <what's happening>"
	const withoutTime = (timeMatch ? raw.replace(TIME, " ") : raw).replace(/\s+/g, " ").trim();
	const dashed = /^[-–—]/.test(withoutTime);
	const rest = withoutTime.replace(/^[\s\-–—:]+/, "");

	// the list can run on past a space after a separator ("ORD, MDW"), but not otherwise
	const words = rest.split(" ").filter(Boolean);
	const facilities: string[] = [];
	let used = 0;

	while (used < words.length) {
		const parsed = parseFacilities(words[used]);
		if (!parsed || !(dashed || parsed.every(code => known.has(code)))) break;

		facilities.push(...parsed);
		used++;
		if (!/[/,]$/.test(words[used - 1])) break;
	}

	const row: Omit<ParsedPlannedEntry, "iataCode"> = {
		forecastType,
		time: timeMatch ? `${timeMatch[2]}Z` : null,
		at: at ? at.toISOString() : null,
		// whatever isn't the airports is the description
		eventType: sentenceCase(words.slice(used).join(" ")),
		raw
	};

	const airports = [...new Set(facilities)];
	return airports.length
		? airports.map(iataCode => ({ ...row, iataCode }))
		: [{ ...row, iataCode: null }];
};

/** soonest first; entries without a time go last */
export const byTime = (a: ParsedPlannedEntry, b: ParsedPlannedEntry) =>
	(a.at ?? "￿").localeCompare(b.at ?? "￿");
