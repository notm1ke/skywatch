"use client";

import { useMemo } from "react";
import { useAirportFilters } from "./store";
import { AirportList } from "./airport-list";
import { AirportAdvisory } from "~/lib/schemas";
import { FilterSidebar } from "./filter-sidebar";
import { AirportsPageSkeleton } from "./skeleton";
import { useAirports } from "~/components/airport-provider";
import { useAirspace } from "~/components/airspace/provider";

function getAdvisoryStatus(advisory: AirportAdvisory | undefined): "ground_stop" | "delay" | "normal" {
	if (!advisory) return "normal";
	if (advisory.groundStop || advisory.airportClosure) return "ground_stop";
	if (advisory.groundDelay || advisory.arrivalDelay || advisory.departureDelay) return "delay";
	return "normal";
}

export const AirportsTab = () => {
	const { airports, loading } = useAirports();
	const { advisories } = useAirspace();
	const { search, status, type, hubAirline, artcc, state, capabilities, runwayRange, elevationRange, timezone, atcType, sortBy } = useAirportFilters();

	const advisoryMap = useMemo(
		() => new Map(advisories.map((a) => [a.airportId, a])),
		[advisories],
	);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();
		return airports
			.filter((a) => {
				if (!q) return true;
				const stateCode = (a.iso_region.split("-")[1] ?? "").toLowerCase();
				return (
					a.iata_code.toLowerCase().includes(q) ||
					a.name.toLowerCase().includes(q) ||
					a.municipality.toLowerCase().includes(q) ||
					stateCode.includes(q)
				);
			})
			.filter((a) => {
				if (!status.length) return true;
				const s = getAdvisoryStatus(advisoryMap.get(a.iata_code));
				return status.includes(s);
			})
			.filter((a) => !type.length || type.includes(a.type))
			.filter((a) => !hubAirline.length || a.airline_hubs.some((h: { airline_iata: string }) => hubAirline.includes(h.airline_iata)))
			.filter((a) => !artcc.length || artcc.includes(a.artcc))
			.filter((a) => {
				if (!state.length) return true;
				return state.includes(a.iso_region.split("-")[1] ?? "");
			})
			.filter((a) => {
				if (!capabilities.length) return true;
				return capabilities.every((cap) => {
					if (cap === "precheck") return a.supports_precheck;
					if (cap === "clear") return a.supports_clear;
					if (cap === "cbp") return a.has_cbp;
					if (cap === "atis") return a.supports_atis;
					if (cap === "rvr") return a.supports_rvr;
					return false;
				});
			})
			.filter((a) => {
				if (!runwayRange) return true;
				const count = a.runways.length;
				return count >= runwayRange[0] && count <= runwayRange[1];
			})
			.filter((a) => {
				if (!elevationRange) return true;
				if (a.elevation_ft == null) return false;
				return a.elevation_ft >= elevationRange[0] && a.elevation_ft <= elevationRange[1];
			})
			.filter((a) => {
				if (!atcType.length) return true;
				const val = a.atc_type ?? "UNCONTROLLED";
				return atcType.includes(val);
			})
			.filter((a) => !timezone.length || (a.timezone != null && timezone.includes(a.timezone)))
			.sort((a, b) => {
				if (sortBy === "iata") return a.iata_code.localeCompare(b.iata_code);
				if (sortBy === "city") return a.municipality.localeCompare(b.municipality);
				return a.name.localeCompare(b.name);
			});
	}, [airports, search, status, type, hubAirline, artcc, state, capabilities, runwayRange, elevationRange, timezone, atcType, sortBy, advisoryMap]);

	if (loading) return <AirportsPageSkeleton />;

	return (
		<div className="flex h-[calc(100svh-4rem)] overflow-hidden">
			<FilterSidebar airports={airports} advisoryMap={advisoryMap} />
			<AirportList airports={filtered} advisoryMap={advisoryMap} total={airports.length} />
		</div>
	);
};
