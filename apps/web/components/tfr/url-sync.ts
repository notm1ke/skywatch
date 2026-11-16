import { useEffect } from "react";
import { useTfrControls } from "./store";

/**
 * Keeps the open TFR and the view options in the URL so they can be shared: /tfrs?id=6/7601&hide=SECURITY&view=map
 *
 *   id     the open TFR, by NOTAM number (the map flies to it)
 *   hide   the TFR types switched off, comma separated
 *   view   `map` when the table only lists what the map is showing
 *
 * Uses history.replaceState rather than the Next router: nothing needs to re-render or refetch when the URL changes,
 * and opening TFRs shouldn't add a history entry each.
 */

const ID = /^\d{1,2}\/\d{1,6}$/;
const TYPE = /^[A-Z /]{2,30}$/;

type State = ReturnType<typeof useTfrControls.getState>;

const toSearch = (state: State) => {
	const params = new URLSearchParams();

	if (state.selectedId) params.set("id", state.selectedId);
	if (state.hiddenTypes.length) params.set("hide", state.hiddenTypes.join(","));
	if (state.inView) params.set("view", "map");

	// keep the commas and the slashes readable
	return params.toString().replace(/%2C/g, ",").replace(/%2F/g, "/");
};

const changed = (a: State, b: State) =>
	a.selectedId !== b.selectedId
	|| a.hiddenTypes !== b.hiddenTypes
	|| a.inView !== b.inView;

const write = (state: State) => {
	const search = toSearch(state);
	const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
	const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (next !== current) window.history.replaceState(window.history.state, "", next);
};

export const useTfrUrlSync = () => {
	useEffect(() => {
		// 1. restore a shared view: only what the link actually says, so coming back to the page keeps its last state
		const params = new URLSearchParams(window.location.search);
		const id = params.get("id");
		const hidden = params.get("hide");

		if (hidden) useTfrControls.setState({ hiddenTypes: hidden.split(",").filter(type => TYPE.test(type)) });
		if (params.get("view") === "map") useTfrControls.setState({ inView: true });
		if (id && ID.test(id)) useTfrControls.getState().select(id, true);

		// 2. from here on, keep the URL in step with the page (and put what's already open into it)
		write(useTfrControls.getState());

		return useTfrControls.subscribe((state, previous) => {
			if (changed(state, previous)) write(state);
		});
	}, []);
};
