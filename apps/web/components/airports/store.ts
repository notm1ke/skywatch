import { create } from "zustand/react";

export type AirportSortBy = "name" | "iata" | "city";

type AirportFilters = {
	search: string;
	status: string[];
	type: string[];
	hubAirline: string[];
	artcc: string[];
	state: string[];
	capabilities: string[];
	runwayRange: [number, number] | null;
	elevationRange: [number, number] | null;
	timezone: string[];
	atcType: string[];
	sortBy: AirportSortBy;
};

export type AirportFilteringControls = AirportFilters & {
	filter: (filters: Partial<AirportFilters>) => void;
	reset: () => void;
};

const defaults: AirportFilters = {
	search: "",
	status: [],
	type: [],
	hubAirline: [],
	artcc: [],
	state: [],
	capabilities: [],
	runwayRange: null,
	elevationRange: null,
	timezone: [],
	atcType: [],
	sortBy: "name",
};

export const useAirportFilters = create<AirportFilteringControls>((set) => ({
	...defaults,
	filter: (filters) => set(filters),
	reset: () => set(defaults),
}));
