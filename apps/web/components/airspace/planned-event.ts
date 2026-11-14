/**
 * Decoration for planned interruptions. The text comes from a free-text FAA feed, so this only ever adds color, an icon
 * and an explanation when a keyword happens to match. The text itself is always shown as it came, and anything that
 * doesn't match falls back to "other".
 */

export type PlanKind = "stop" | "delay" | "closure" | "weather" | "facility" | "traffic" | "other";

// first match wins, so the more severe words go first ("GROUND STOP/DELAY PROGRAM" is a stop)
const RULES: Array<[PlanKind, RegExp]> = [
	["closure", /\b(closed|closure)\b/i],
	["stop", /ground\s+stop|\bgs\b/i],
	["delay", /ground\s+delay|\bgdp\b|\bdelays?\b/i],
	["weather", /thunder|storm|\bwind|\bfog|snow|\bice\b|icing|ceiling|visibility|\brain|weather|turbulence|hurricane|tornado/i],
	["facility", /runway|\brwy\b|construction|outage|navaid|\bils\b|equipment|maintenance|notam/i],
	["traffic", /volume|demand|staffing|trigger|swap|sector|capacity/i]
];

// "possible" and friends: the FAA is watching it, nothing has been issued
const HEDGE = /\b(possible|possibly|potential|probable|likely|expected|anticipated|may)\b/i;

export const classifyPlan = (text: string): { kind: PlanKind; hedged: boolean } => ({
	kind: RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? "other",
	hedged: HEDGE.test(text)
});

const minutesLabel = (minutes: number) => {
	const days = Math.floor(minutes / (24 * 60));
	const hours = Math.floor(minutes / 60) % 24;
	const rest = minutes % 60;

	if (days > 0) return hours === 0 ? `${days}d` : `${days}d ${hours}h`;
	if (hours === 0) return `${rest}m`;
	return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

/** "ends in 2h 15m", "ended 10m ago", "starts in 3h", "since 20m ago": relative to the plan's time */
export const relativeTime = (at: number, now: number, type: "until" | "after" | null) => {
	const minutes = Math.round(Math.abs(at - now) / 60000);
	if (minutes < 1) return type === "after" ? "starting now" : "ending now";

	const future = at > now;
	const span = minutesLabel(minutes);

	if (type === "after") return future ? `starts in ${span}` : `since ${span} ago`;
	if (type === "until") return future ? `ends in ${span}` : `ended ${span} ago`;
	return future ? `in ${span}` : `${span} ago`;
};
