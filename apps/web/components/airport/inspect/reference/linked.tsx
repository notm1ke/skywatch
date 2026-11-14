"use client";

import { useMemo } from "react";
import { AirportWithJoins } from "@skywatch/gateway/schemas";

import {
	decodeFrequencyType,
	decodeSurface,
	formatNavaidFrequency
} from "./decode";

import {
	BooleanValue,
	DecodedValue,
	NoValue,
	ReferenceCard,
	TableScroll,
	Td,
	Th
} from "./primitives";

type Props = { airport: AirportWithJoins };
type Runway = AirportWithJoins["runways"][number];

const EmptyRows: React.FC<{ children: string }> = ({ children }) => (
	<div className="px-3 py-3 text-sm text-muted-foreground">{children}</div>
);

// ---------------------------------------------------------------------------------------------
// Frequencies

// Roughly the order a pilot works an airport: ATIS -> clearance -> ground -> tower -> departure/approach -> the rest.
const FREQUENCY_ORDER = ["ATIS", "AWOS", "ASOS", "CLD", "CLNC", "GND", "RMP", "TWR", "DEP", "APP", "APP/DEP", "CTAF", "UNIC", "UNICOM", "MULTICOM"];

const frequencyRank = (type: string) => {
	const index = FREQUENCY_ORDER.indexOf(type.toUpperCase());
	return index === -1 ? FREQUENCY_ORDER.length : index;
};

export const FrequenciesCard: React.FC<Props> = ({ airport }) => {
	const frequencies = useMemo(
		() => [...(airport.frequencies ?? [])].sort((a, b) =>
			frequencyRank(a.type) - frequencyRank(b.type)
			|| a.type.localeCompare(b.type)
			|| a.frequency_mhz - b.frequency_mhz
		),
		[airport.frequencies]
	);

	return (
		<ReferenceCard title="Frequencies" meta={frequencies.length}>
			{frequencies.length === 0
				? <EmptyRows>No frequencies on record.</EmptyRows>
				: (
					<TableScroll>
						<table className="w-full border-separate border-spacing-0">
							<thead>
								<tr>
									<Th>Service</Th>
									<Th>Description</Th>
									<Th className="text-right">MHz</Th>
								</tr>
							</thead>
							<tbody className="[&>tr:not(:first-child)>td]:border-t">
								{frequencies.map(freq => (
									<tr key={freq.id} className="hover:bg-muted/30 transition-colors">
										<Td>
											<DecodedValue decoded={decodeFrequencyType(freq.type)} />
										</Td>
										<Td className="whitespace-normal text-muted-foreground">
											{freq.description || <NoValue />}
										</Td>
										<Td className="text-right font-mono tabular-nums">{freq.frequency_mhz.toFixed(3)}</Td>
									</tr>
								))}
							</tbody>
						</table>
					</TableScroll>
				)}
		</ReferenceCard>
	);
};

// ---------------------------------------------------------------------------------------------
// Navaids

const formatMagVar = (degrees: number | null) => {
	if (degrees == null) return null;
	return `${Math.abs(degrees).toFixed(1)}°${degrees < 0 ? "W" : "E"}`;
};

const formatPosition = (lat: number | null, lon: number | null) =>
	lat == null || lon == null ? null : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

export const NavaidsCard: React.FC<Props> = ({ airport }) => {
	const navaids = useMemo(
		() => [...(airport.navaids ?? [])].sort((a, b) => a.type.localeCompare(b.type) || a.ident.localeCompare(b.ident)),
		[airport.navaids]
	);

	return (
		<ReferenceCard title="Navaids" meta={navaids.length}>
			{navaids.length === 0
				? <EmptyRows>No associated navaids on record.</EmptyRows>
				: (
					<TableScroll>
						<table className="w-full border-separate border-spacing-0">
							<thead>
								<tr>
									<Th>Ident</Th>
									<Th>Name</Th>
									<Th>Type</Th>
									<Th className="text-right">Frequency</Th>
									<Th>DME</Th>
									<Th>Usage</Th>
									<Th>Power</Th>
									<Th className="text-right">Elev</Th>
									<Th className="text-right">Mag var</Th>
									<Th>Position</Th>
								</tr>
							</thead>
							<tbody className="[&>tr:not(:first-child)>td]:border-t">
								{navaids.map(nav => (
									<tr key={nav.id} className="hover:bg-muted/30 transition-colors">
										<Td className="font-mono font-semibold">{nav.ident}</Td>
										<Td>{nav.name}</Td>
										<Td className="font-mono">{nav.type}</Td>
										<Td className="text-right font-mono tabular-nums">
											{formatNavaidFrequency(nav.type, nav.frequency_khz) ?? <NoValue />}
										</Td>
										<Td className="font-mono">
											{nav.dme_channel || nav.dme_frequency_khz != null
												? <>
													{nav.dme_channel}
													{nav.dme_frequency_khz != null && (
														<span className="text-muted-foreground"> {nav.dme_channel ? "· " : ""}{(nav.dme_frequency_khz / 1000).toFixed(2)} MHz</span>
													)}
												</>
												: <NoValue />}
										</Td>
										<Td>{nav.usageType || <NoValue />}</Td>
										<Td>{nav.power || <NoValue />}</Td>
										<Td className="text-right font-mono tabular-nums">
											{nav.elevation_ft == null ? <NoValue /> : `${nav.elevation_ft.toLocaleString()} ft`}
										</Td>
										<Td className="text-right font-mono tabular-nums">
											{formatMagVar(nav.magnetic_variation_deg) ?? <NoValue />}
										</Td>
										<Td className="font-mono text-muted-foreground">
											{formatPosition(nav.latitude_deg, nav.longitude_deg) ?? <NoValue />}
										</Td>
									</tr>
								))}
							</tbody>
						</table>
					</TableScroll>
				)}
		</ReferenceCard>
	);
};

// ---------------------------------------------------------------------------------------------
// Runways

/**
 * A two-line cell: the low-numbered end on top, the high-numbered end below, each tagged with its
 * ident. Keeps every static per-end value on one row per runway without doubling the table width.
 */
const EndPair: React.FC<{
	runway: Runway;
	low: React.ReactNode;
	high: React.ReactNode;
	align?: "left" | "right";
}> = ({ runway, low, high, align = "left" }) => (
	<div className="space-y-0.5 font-mono tabular-nums">
		{([[runway.le_ident, low], [runway.he_ident, high]] as const).map(([ident, value], i) => (
			<div key={i} className={`flex items-baseline gap-2 ${align === "right" ? "justify-end" : ""}`}>
				<span className="w-8 shrink-0 text-xs text-muted-foreground">{ident || "—"}</span>
				<span>{value ?? <NoValue />}</span>
			</div>
		))}
	</div>
);

const heading = (value: number | null) => (value == null ? null : `${Math.round(value).toString().padStart(3, "0")}°`);
const feet = (value: number | null) => (value == null ? null : `${value.toLocaleString()} ft`);
const displaced = (value: number | null) => (value ? `${value.toLocaleString()} ft` : null);

const runwayLabel = (rwy: Runway) => [rwy.le_ident, rwy.he_ident].filter(Boolean).join("/") || "—";

const identNumber = (ident: string | null) => parseInt(ident ?? "", 10) || 0;

export const RunwaysCard: React.FC<Props> = ({ airport }) => {
	const runways = useMemo(
		() => [...(airport.runways ?? [])].sort((a, b) =>
			identNumber(a.le_ident) - identNumber(b.le_ident) || (a.le_ident ?? "").localeCompare(b.le_ident ?? "")
		),
		[airport.runways]
	);

	return (
		<ReferenceCard title="Runways" meta={runways.length}>
			{runways.length === 0
				? <EmptyRows>No runways on record.</EmptyRows>
				: (
					<TableScroll>
						<table className="w-full border-separate border-spacing-0">
							<thead>
								<tr>
									<Th>Runway</Th>
									<Th className="text-right">Length × width</Th>
									<Th>Surface</Th>
									<Th>Lights</Th>
									<Th>Status</Th>
									<Th>Heading (true)</Th>
									<Th>Elevation</Th>
									<Th>Displaced thr.</Th>
									<Th>Threshold position</Th>
								</tr>
							</thead>
							<tbody className="[&>tr:not(:first-child)>td]:border-t">
								{runways.map(rwy => (
									<tr key={rwy.id} className="hover:bg-muted/30 transition-colors">
										<Td className="font-mono font-semibold">{runwayLabel(rwy)}</Td>
										<Td className="text-right font-mono tabular-nums">
											{rwy.length_ft == null
												? <NoValue />
												: <>{rwy.length_ft.toLocaleString()}{rwy.width_ft != null && <span className="text-muted-foreground"> × {rwy.width_ft.toLocaleString()}</span>} ft</>}
										</Td>
										<Td><DecodedValue decoded={decodeSurface(rwy.surface)} /></Td>
										<Td><BooleanValue value={rwy.lighted} yes="Lighted" no="Unlit" /></Td>
										<Td>
											{rwy.closed == null
												? <BooleanValue value={null} />
												: rwy.closed
													? <span className="text-red-600 dark:text-red-400">Closed</span>
													: <span className="text-green-600 dark:text-green-400">Open</span>}
										</Td>
										<Td><EndPair runway={rwy} low={heading(rwy.le_heading_degT)} high={heading(rwy.he_heading_degT)} /></Td>
										<Td><EndPair runway={rwy} low={feet(rwy.le_elevation_ft)} high={feet(rwy.he_elevation_ft)} /></Td>
										<Td><EndPair runway={rwy} low={displaced(rwy.le_displaced_threshold_ft)} high={displaced(rwy.he_displaced_threshold_ft)} /></Td>
										<Td>
											<EndPair
												runway={rwy}
												low={formatPosition(rwy.le_latitude_deg, rwy.le_longitude_deg)}
												high={formatPosition(rwy.he_latitude_deg, rwy.he_longitude_deg)}
											/>
										</Td>
									</tr>
								))}
							</tbody>
						</table>
					</TableScroll>
				)}
		</ReferenceCard>
	);
};
