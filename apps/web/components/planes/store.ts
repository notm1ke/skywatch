import { create } from "zustand/react";

type PlaneFilters = {
	registration: string;
	status: string[];
	manufacturer: string[];
	model: string[];
	aircraft_type: string[];
	engine_type: string[];
	owner_name: string[];
	fractionally_owned: string[];
};

export type PlaneFilteringControls = Partial<PlaneFilters> & {
	filter: (filters: Partial<Omit<PlaneFilteringControls, "filter" | "reset">>) => void;
	reset: () => void;
};

const defaults: Partial<PlaneFilters> = {
	registration: undefined,
	status: undefined,
	manufacturer: undefined,
	model: undefined,
	aircraft_type: undefined,
	engine_type: undefined,
	owner_name: undefined,
	fractionally_owned: undefined,
};

export const usePlaneFilteringControls = create<PlaneFilteringControls>((set) => ({
	...defaults,
	filter: (filters) => set(filters),
	reset: () => set(defaults),
}));
