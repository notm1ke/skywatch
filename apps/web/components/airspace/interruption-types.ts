import { InterruptionEvent } from "~/lib/schemas";

export type EventType = InterruptionEvent["event_type"];

export const TYPE_LABEL: Record<EventType, string> = {
	airport_closure: "Airport Closure",
	ground_stop: "Ground Stop",
	ground_delay: "Ground Delay",
	dual_delay: "Arr + Dep Delay",
	arrival_delay: "Arrival Delay",
	departure_delay: "Departure Delay"
};

// mirrors active-programs.tsx's AdvisoryType priority order (AirportClosure >
// GroundStop > GroundDelay > DualDelay > ArrivalDelay > DepartureDelay) — the
// delay subtypes are NOT all equally severe, so they can't share a rank
export const TYPE_RANK: Record<EventType, number> = {
	airport_closure: 6,
	ground_stop: 5,
	ground_delay: 4,
	dual_delay: 3,
	arrival_delay: 2,
	departure_delay: 1
};

export const TYPE_COLOR: Record<EventType, string> = {
	airport_closure: "bg-red-400",
	ground_stop: "bg-orange-400",
	ground_delay: "bg-yellow-400",
	dual_delay: "bg-yellow-400",
	arrival_delay: "bg-yellow-400",
	departure_delay: "bg-yellow-400"
};

// for SVG stroke/fill attributes, where a Tailwind class won't work
export const TYPE_STROKE: Record<EventType, string> = {
	airport_closure: "var(--color-red-400)",
	ground_stop: "var(--color-orange-400)",
	ground_delay: "var(--color-yellow-400)",
	dual_delay: "var(--color-yellow-400)",
	arrival_delay: "var(--color-yellow-400)",
	departure_delay: "var(--color-yellow-400)"
};
