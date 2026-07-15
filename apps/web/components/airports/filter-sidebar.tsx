"use client";

import { cn } from "cnfast";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAirportFilters } from "./store";
import { Slider } from "~/components/ui/slider";
import { AirportAdvisory } from "~/lib/schemas";
import { AirportSearch } from "./airport-search";
import { UsStateAbbreviations } from "~/lib/geo";
import { AIRLINES, AirlineCode } from "./airlines";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { AirportWithJoins, AirspaceLocalizations } from "@skywatch/gateway/schemas";
import { Disclosure, DisclosureTrigger, DisclosureContent } from "~/components/ui/disclosure";

const TYPE_LABELS: Record<string, string> = {
	large_airport: "Large",
	medium_airport: "Medium",
	small_airport: "Small",
};


const ATC_TYPE_ORDER = ["UNCONTROLLED", "NON-ATCT", "ATCT", "ATCT-A/C", "ATCT-RAPCON", "ATCT-RATCF", "ATCT-TRACON"];

const ATC_TYPE_LABELS: Record<string, string> = {
	"UNCONTROLLED": "Uncontrolled",
	"NON-ATCT":     "No Tower",
	"ATCT":         "Tower",
	"ATCT-A/C":     "Tower + Appr Ctrl",
	"ATCT-RAPCON":  "Tower + Radar Appr Ctrl",
	"ATCT-RATCF":   "Tower + Radar ATC Facil",
	"ATCT-TRACON":  "Tower + Term Radar Appr Ctrl",
};

const CAPABILITY_LABELS: Record<string, string> = {
	atis: "ATIS",
	cbp: "CBP Port of Entry",
	precheck: "TSA PreCheck",
	clear: "CLEAR+",
	rvr: "Runway Visual Range",
};

function Section({
	title,
	defaultOpen = true,
	children,
}: {
	title: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="border-b">
			<Disclosure open={open} onOpenChange={setOpen} transition={{ duration: 0.15, ease: "easeInOut" }}>
				<DisclosureTrigger>
					<button className="flex w-full items-center justify-between pl-4 sm:pl-5 pr-4 sm:pr-3 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
						<span>{title}</span>
						<ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
					</button>
				</DisclosureTrigger>
				<DisclosureContent>
					<div className="pb-2">{children}</div>
				</DisclosureContent>
			</Disclosure>
		</div>
	);
}

export function FilterCheck({
	label,
	value,
	active,
	count,
	onToggle,
}: {
	label: string;
	value: string;
	active: boolean;
	count?: number;
	onToggle: (value: string) => void;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-2 pl-4 sm:pl-5 pr-4 sm:pr-3.5 py-1 text-xs hover:bg-accent/50 transition-colors">
			<Checkbox
				checked={active}
				onCheckedChange={() => onToggle(value)}
				className="size-3 rounded-[3px]"
			/>
			<span className={cn("flex-1 truncate", active ? "text-foreground" : "text-muted-foreground")}>
				{label}
			</span>
			{count !== undefined && (
				<span className="text-muted-foreground/60 tabular-nums">{count?.toLocaleString() ?? '--'}</span>
			)}
		</label>
	);
}

function toggle(arr: string[], value: string): string[] {
	return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export const FilterSidebarContent = ({
	airports,
	advisoryMap,
}: {
	airports: AirportWithJoins[];
	advisoryMap: Map<string, AirportAdvisory>;
}) => {
	const { type, hubAirline, artcc, state, capabilities, runwayRange, elevationRange, timezone, atcType, filter } = useAirportFilters();
	const runwayCounts = airports.map((a) => a.runways.length);
	const dataMin = runwayCounts.length ? Math.min(...runwayCounts) : 0;
	const dataMax = runwayCounts.length ? Math.max(...runwayCounts) : 10;
	const currentRange = runwayRange ?? [dataMin, dataMax];

	const elevationValues = airports.map((a) => a.elevation_ft).filter((e): e is number => e != null);
	const elevMin = elevationValues.length ? Math.min(...elevationValues) : 0;
	const elevMax = elevationValues.length ? Math.max(...elevationValues) : 10000;
	const currentElevRange = elevationRange ?? [elevMin, elevMax];

	const atcTypeCounts = Object.fromEntries(
		ATC_TYPE_ORDER.map((val) => [
			val,
			val === "UNCONTROLLED"
				? airports.filter((a) => a.atc_type == null).length
				: airports.filter((a) => a.atc_type === val).length,
		]),
	);

	const typeCounts = Object.fromEntries(
		["large_airport", "medium_airport", "small_airport"].map((t) => [
			t,
			airports.filter((a) => a.type === t).length,
		]),
	);

	const hubCounts = Object.fromEntries(
		(Object.keys(AIRLINES) as AirlineCode[]).map((code) => [
			code,
			airports.filter((a) => a.airline_hubs.some((h: { airline_iata: string }) => h.airline_iata === code)).length,
		]),
	);

	const artccValues = [...new Set(airports.map((a) => a.artcc).filter(Boolean))].sort();
	const artccCounts = Object.fromEntries(
		artccValues.map((z) => [z, airports.filter((a) => a.artcc === z).length]),
	);

	const stateValues = [...new Set(
		airports.map((a) => a.iso_region.split("-")[1]).filter(Boolean),
	)].sort() as string[];

	const stateCounts = Object.fromEntries(
		stateValues.map((s) => [s, airports.filter((a) => a.iso_region.endsWith(`-${s}`)).length]),
	);

	const timezoneValues = [...new Set(airports.map((a) => a.timezone).filter(Boolean))].sort() as string[];
	const timezoneCounts = Object.fromEntries(
		timezoneValues.map((tz) => [tz, airports.filter((a) => a.timezone === tz).length]),
	);

	return (
		<>
			<div className="h-[41px] shrink-0">
				<AirportSearch />
			</div>

			<ScrollArea className="flex-1">
				<Section title="Airport Type" defaultOpen>
					{(["large_airport", "medium_airport", "small_airport"] as const).map((t) => (
						<FilterCheck
							key={t}
							label={TYPE_LABELS[t]}
							value={t}
							active={type.includes(t)}
							count={typeCounts[t]}
							onToggle={(v) => filter({ type: toggle(type, v) })}
						/>
					))}
				</Section>

				<Section title="Air Traffic Control" defaultOpen={false}>
					{ATC_TYPE_ORDER.map((val) => (
						<FilterCheck
							key={val}
							label={ATC_TYPE_LABELS[val]}
							value={val}
							active={atcType.includes(val)}
							count={atcTypeCounts[val]}
							onToggle={(v) => filter({ atcType: toggle(atcType, v) })}
						/>
					))}
				</Section>

				<Section title="Airline Hub" defaultOpen>
					{(Object.keys(AIRLINES) as AirlineCode[]).map((code) => (
						<FilterCheck
							key={code}
							label={AIRLINES[code].name}
							value={code}
							active={hubAirline.includes(code)}
							count={hubCounts[code]}
							onToggle={(v) => filter({ hubAirline: toggle(hubAirline, v) })}
						/>
					))}
				</Section>
				
				<Section title="Capabilities" defaultOpen={false}>
					{(Object.keys(CAPABILITY_LABELS) as string[]).map((cap) => (
						<FilterCheck
							key={cap}
							label={CAPABILITY_LABELS[cap]}
							value={cap}
							active={capabilities.includes(cap)}
							onToggle={(v) => filter({ capabilities: toggle(capabilities, v) })}
						/>
					))}
				</Section>
				
				<Section title="Runways" defaultOpen={false}>
					<div className="px-4 sm:px-5 pb-2 pt-1">
						<div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
							<span>{currentRange[0]}</span>
							<span>{currentRange[1]}</span>
						</div>
						<Slider
							min={dataMin}
							max={dataMax}
							value={currentRange}
							onValueChange={(val) => {
								const [lo, hi] = val as [number, number];
								filter({ runwayRange: lo === dataMin && hi === dataMax ? null : [lo, hi] });
							}}
						/>
					</div>
				</Section>

				<Section title="Elevation" defaultOpen={false}>
					<div className="px-4 sm:px-5 pb-2 pt-1">
						<div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
							<span>{currentElevRange[0].toLocaleString()}ft</span>
							<span>{currentElevRange[1].toLocaleString()}ft</span>
						</div>
						<Slider
							min={elevMin}
							max={elevMax}
							value={currentElevRange}
							onValueChange={(val) => {
								const [lo, hi] = val as [number, number];
								filter({ elevationRange: lo === elevMin && hi === elevMax ? null : [lo, hi] });
							}}
						/>
					</div>
				</Section>

				<Section title="Airspace" defaultOpen={false}>
					{artccValues.map((z) => (
						<FilterCheck
							key={z}
							label={`${z} - ${AirspaceLocalizations[z]}`}
							value={z}
							active={artcc.includes(z)}
							count={artccCounts[z]}
							onToggle={(v) => filter({ artcc: toggle(artcc, v) })}
						/>
					))}
				</Section>
	
				<Section title="State" defaultOpen={false}>
					{stateValues.map((s) => (
						<FilterCheck
							key={s}
							label={UsStateAbbreviations[s]}
							value={s}
							active={state.includes(s)}
							count={stateCounts[s]}
							onToggle={(v) => filter({ state: toggle(state, v) })}
						/>
					))}
				</Section>

				<Section title="Timezone" defaultOpen={false}>
					{timezoneValues.map((tz) => (
						<FilterCheck
							key={tz}
							label={tz}
							value={tz}
							active={timezone.includes(tz)}
							count={timezoneCounts[tz]}
							onToggle={(v) => filter({ timezone: toggle(timezone, v) })}
						/>
					))}
				</Section>
			</ScrollArea>
		</>
	);
};

export const FilterSidebar = ({
	airports,
	advisoryMap,
}: {
	airports: AirportWithJoins[];
	advisoryMap: Map<string, AirportAdvisory>;
}) => (
	<aside className="hidden sm:flex w-64 shrink-0 flex-col border-r">
		<FilterSidebarContent airports={airports} advisoryMap={advisoryMap} />
	</aside>
);
