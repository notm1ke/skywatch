"use client";

import moment from "moment-timezone";

import { UsStateAbbreviations } from "~/lib/geo";
import { AirportWithJoins } from "@skywatch/gateway/schemas";
import { ATC_TYPE_LABELS, CAPABILITY_LABELS } from "~/lib/airport-labels";

import {
	AIRPORT_TYPE_LABELS,
	ARTCC_NAMES,
	CONTINENT_LABELS,
	Decoded,
	cleanList,
	decodeAtcType,
	decodeFederalAgreement,
	decodeFuel,
	decodeInspectionMethod,
	decodeInspector,
	decodePart139,
	dialablePhone,
	toDms
} from "./decode";

import {
	BooleanValue,
	Chip,
	CopyableCode,
	DecodedValue,
	ExternalAnchor,
	Field,
	Fields,
	NoValue,
	ReferenceCard
} from "./primitives";

type Props = { airport: AirportWithJoins; className?: string };

const regionName = (isoCountry: string | null | undefined) => {
	if (!isoCountry) return null;
	try {
		return new Intl.DisplayNames(["en"], { type: "region" }).of(isoCountry) ?? isoCountry;
	} catch {
		return isoCountry;
	}
};

export const IdentityCard: React.FC<Props> = ({ airport, className }) => {
	const keywords = (airport.keywords ?? "").split(",").map(k => k.trim()).filter(Boolean);

	return (
		<ReferenceCard title="Identity" className={className}>
			<Fields>
				<Field label="Name">{airport.name}</Field>
				<Field label="Type">{AIRPORT_TYPE_LABELS[airport.type] ?? airport.type}</Field>
				<Field label="IATA"><CopyableCode value={airport.iata_code} /></Field>
				<Field label="ICAO"><CopyableCode value={airport.icao_code} /></Field>
				<Field label="FAA / local"><CopyableCode value={airport.local_code} /></Field>
				<Field label="GPS"><CopyableCode value={airport.gps_code} /></Field>
				<Field label="Ident"><CopyableCode value={airport.ident} /></Field>
				<Field label="Scheduled service">
					<BooleanValue value={airport.scheduled_service == null ? null : airport.scheduled_service.toLowerCase() === "yes"} />
				</Field>
				<Field label="Website">
					{airport.home_link ? <ExternalAnchor href={airport.home_link}>{airport.home_link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</ExternalAnchor> : <NoValue />}
				</Field>
				<Field label="Wikipedia">
					{airport.wikipedia_link ? <ExternalAnchor href={airport.wikipedia_link}>Article</ExternalAnchor> : <NoValue />}
				</Field>
				{keywords.length > 0 && (
					<Field label="Also known as">
						<span className="flex flex-wrap justify-end gap-1">
							{keywords.map(keyword => <Chip key={keyword}>{keyword}</Chip>)}
						</span>
					</Field>
				)}
			</Fields>
		</ReferenceCard>
	);
};

/** Every capability, yes or no: on a reference page, "no PreCheck" is information. */
export const ServicesCard: React.FC<Props> = ({ airport, className }) => {
	const services: { label: string; value: boolean }[] = [
		{ label: CAPABILITY_LABELS.atis, value: airport.supports_atis },
		{ label: CAPABILITY_LABELS.rvr, value: airport.supports_rvr },
		{ label: CAPABILITY_LABELS.cbp, value: airport.has_cbp },
		{ label: CAPABILITY_LABELS.globalEntry, value: airport.supports_global_entry },
		{ label: "CBP Global Entry Enrollment", value: airport.supports_ge_enrollment },
		{ label: CAPABILITY_LABELS.mpc, value: airport.supports_mpc },
		{ label: CAPABILITY_LABELS.precheck, value: airport.supports_precheck },
		{ label: CAPABILITY_LABELS.clear, value: airport.supports_clear },
	];

	return (
		<ReferenceCard title="Services" className={className}>
			<Fields>
				{services.map(service => (
					<Field key={service.label} label={service.label}>
						<BooleanValue value={service.value} yes="Available" no="Not available" />
					</Field>
				))}
			</Fields>
		</ReferenceCard>
	);
};

export const LocationCard: React.FC<Props> = ({ airport, className }) => {
	const [country, state] = (airport.iso_region ?? "").split("-");
	const stateName = state ? UsStateAbbreviations[state] : undefined;
	const lat = airport.latitude_deg;
	const lon = airport.longitude_deg;

	const tz = airport.timezone && moment.tz.zone(airport.timezone) ? airport.timezone : null;
	const now = tz ? moment.tz(tz) : null;

	return (
		<ReferenceCard title="Location" className={className}>
			<div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x">
				<Fields className="border-b sm:border-b-0">
					<Field label="Municipality">{airport.municipality || <NoValue />}</Field>
					<Field label="Region">
						{airport.iso_region
							? <>{stateName ? `${stateName} ` : ""}<span className="font-mono text-muted-foreground">{airport.iso_region}</span></>
							: <NoValue />}
					</Field>
					<Field label="Country">{regionName(airport.iso_country ?? country) ?? <NoValue />}</Field>
					<Field label="Continent">{CONTINENT_LABELS[airport.continent] ?? airport.continent ?? <NoValue />}</Field>
				</Fields>

				<Fields>
					<Field label="Coordinates">
						<CopyableCode value={`${lat.toFixed(5)}, ${lon.toFixed(5)}`} />
					</Field>
					<Field label="DMS" mono>{toDms(lat, "lat")} {toDms(lon, "lon")}</Field>
					<Field label="Elevation" mono>
						{airport.elevation_ft == null
							? <NoValue />
							: <>{airport.elevation_ft.toLocaleString()} ft <span className="text-muted-foreground">({Math.round(airport.elevation_ft * 0.3048).toLocaleString()} m)</span></>}
					</Field>
					<Field label="Timezone">
						{tz && now
							? <><span className="font-mono">{tz}</span> <span className="text-muted-foreground">{now.format("z (Z)")}</span></>
							: <NoValue />}
					</Field>
				</Fields>
			</div>
		</ReferenceCard>
	);
};

const inspectionDate = (value: Date | string | null | undefined) => {
	if (!value) return null;
	const date = new Date(value);
	return isNaN(date.getTime()) ? null : date;
};

export const FacilityCard: React.FC<Props> = ({ airport, className }) => {
	const part139 = decodePart139(airport.rescue_flags);
	const agreements = cleanList(airport.nasp_flags).map(decodeFederalAgreement);
	const fuels = cleanList(airport.fuel_types).map(decodeFuel);
	const artcc = airport.artcc?.trim();
	const fss = airport.fss_number?.trim();

	return (
		<ReferenceCard title="Facility" className={className}>
			<Fields>
				<Field label="Control tower">
					<DecodedValue decoded={decodeAtcType(ATC_TYPE_LABELS, airport.atc_type)} />
				</Field>
				<Field label="ARTCC">
					{artcc
						? <><span className="font-mono">{artcc}</span>{ARTCC_NAMES[artcc] && <span className="text-muted-foreground"> · {ARTCC_NAMES[artcc]}</span>}</>
						: <NoValue />}
				</Field>
				<Field label="Flight service">
					{fss
						? <a className="font-mono hover:underline underline-offset-4" href={`tel:${dialablePhone(fss)}`}>{fss}</a>
						: <NoValue />}
				</Field>
				<Field label="Part 139">
					{part139 ? <DecodedValue decoded={part139} /> : <span className="text-muted-foreground">Not certificated</span>}
				</Field>
				<Field label="Fuel">
					{fuels.length
						? <span className="flex flex-wrap justify-end gap-1">{fuels.map(fuel => <CodeChip key={fuel.raw} text={fuel.known ? fuel.label : fuel.raw} decoded={fuel} />)}</span>
						: <NoValue>None reported</NoValue>}
				</Field>
				<Field label="Federal agreements">
					{agreements.length
						? <span className="flex flex-wrap justify-end gap-1">{agreements.map(code => <CodeChip key={code.raw} text={code.raw} decoded={code} />)}</span>
						: <NoValue />}
				</Field>
				<Field label="Military joint use"><BooleanValue value={airport.mil_joint_use} /></Field>
				<Field label="Military landing rights"><BooleanValue value={airport.mil_ldg_rights} /></Field>
			</Fields>
		</ReferenceCard>
	);
};

/** A code chip: `text` is what's shown, the decoded meaning and raw code live in the tooltip. */
const CodeChip: React.FC<{ text: string; decoded: Decoded }> = ({ text, decoded }) => (
	<Chip>
		<DecodedValue
			className="no-underline"
			decoded={{ ...decoded, label: text, detail: decoded.detail ?? (decoded.known ? decoded.label : undefined) }}
		/>
	</Chip>
);

export const InspectionCard: React.FC<Props> = ({ airport, className }) => {
	const date = inspectionDate(airport.inspection_date);

	return (
		<ReferenceCard title="Inspection" className={className}>
			<Fields>
				<Field label="Method"><DecodedValue decoded={decodeInspectionMethod(airport.inspection_type)} /></Field>
				<Field label="Inspected by"><DecodedValue decoded={decodeInspector(airport.inspector_type)} /></Field>
				<Field label="Last inspected">
					{date
						? <>
							{date.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })}
							<span className="text-muted-foreground"> · {moment.utc(date).fromNow()}</span>
						</>
						: <NoValue>Unknown</NoValue>}
				</Field>
			</Fields>
		</ReferenceCard>
	);
};
