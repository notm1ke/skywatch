import { useEffect } from "react";
import { useWaypointControls } from "./store";

/**
 * Keeps the open waypoint and the view options in the URL so they can be shared: /waypoints?id=ABR&charts=ifr&hide=WP,RP
 *
 *   id       the open waypoint (the map flies to it)
 *   charts   ifr | vfr (the plain map is the default)
 *   hide     the waypoint types switched off, comma separated
 *
 * Uses history.replaceState rather than the Next router: nothing needs to re-render or refetch when the URL changes,
 * and opening waypoints shouldn't add a history entry each.
 */

const ID = /^[A-Z0-9]{2,8}$/;
const TYPE = /^[A-Z]{1,5}$/;

type State = ReturnType<typeof useWaypointControls.getState>;

const toSearch = (state: State) => {
	const params = new URLSearchParams();

	if (state.selectedId) params.set("id", state.selectedId);
	if (state.style !== "default") params.set("charts", state.style);
	if (state.hiddenTypes.length) params.set("hide", state.hiddenTypes.join(","));

	// keep the commas readable
	return params.toString().replace(/%2C/g, ",");
};

const changed = (a: State, b: State) =>
	a.selectedId !== b.selectedId
	|| a.style !== b.style
	|| a.hiddenTypes !== b.hiddenTypes;

const write = (state: State) => {
	const search = toSearch(state);
	const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
	const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (next !== current) window.history.replaceState(window.history.state, "", next);
};

export const useWaypointUrlSync = () => {
	useEffect(() => {
		// 1. restore a shared view: only what the link actually says, so coming back to the page keeps its last state
		const params = new URLSearchParams(window.location.search);
		const id = params.get("id")?.toUpperCase();
		const charts = params.get("charts");
		const hidden = params.get("hide");

		if (charts === "ifr" || charts === "vfr") useWaypointControls.setState({ style: charts });
		if (hidden) useWaypointControls.setState({ hiddenTypes: hidden.split(",").filter(type => TYPE.test(type)) });
		if (id && ID.test(id)) useWaypointControls.getState().select(id, true);

		// 2. from here on, keep the URL in step with the page (and put what's already open into it)
		write(useWaypointControls.getState());

		return useWaypointControls.subscribe((state, previous) => {
			if (changed(state, previous)) write(state);
		});
	}, []);
};
