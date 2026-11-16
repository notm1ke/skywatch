"use client";

import moment from "moment-timezone";

import { orpc } from "~/lib/gateway";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { CopyButton } from "../ui/copy-button";
import { ScrollArea } from "../ui/scroll-area";
import { UsStateAbbreviations } from "~/lib/geo";
import { useQuery } from "@tanstack/react-query";
import { useKeyHandler } from "~/hooks/use-key-handler";
import { parseTfrText } from "~/lib/aviation/tfr-parser";
import { AirspaceLocalizations } from "@skywatch/gateway/schemas";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Navigation, SquareArrowOutUpRight, TriangleAlert, X } from "lucide-react";
import { PropsWithChildren, ReactNode, useMemo } from "react";
import { useTfrControls } from "./store";
import { datesOf, isNew, placeOf, typeInfo } from "./types";
import type { TfrIndex, TfrRecord } from "./geo";

const Tip: React.FC<PropsWithChildren<{ label: string }>> = ({ label, children }) => (
	<Tooltip>
		<TooltipTrigger asChild>{children}</TooltipTrigger>
		<TooltipContent side="bottom">{label}</TooltipContent>
	</Tooltip>
);

const Section: React.FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => (
	<section className="grid gap-2 border-t px-3 py-3">
		<h3 className="font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{title}</h3>
		{children}
	</section>
);

const Row: React.FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
	<div className="flex gap-2 text-xs">
		<span className="w-16 shrink-0 text-muted-foreground">{label}</span>
		<span className="min-w-0 wrap-anywhere font-mono">{value}</span>
	</div>
);

const Muted: React.FC<PropsWithChildren> = ({ children }) => (
	<p className="text-xs text-muted-foreground">{children}</p>
);

/** The FAA writes these in UTC: "11/15/2026 23:27:00" */
const formatModified = (raw: string) => {
	const parsed = moment.utc(raw, "MM/DD/YYYY HH:mm:ss", true);
	return parsed.isValid() ? parsed.format("MMM D, YYYY h:mm A [UTC]") : raw;
};

/** what the FAA's own page for a NOTAM is called */
const faaUrl = (id: string) => `https://tfr.faa.gov/tfr3/?page=detail_${id.replaceAll("/", "_")}`;

type DetailsProps = {
	id: string;
	/** the row in the list: its header and summary don't wait for the NOTAM text */
	tfr?: TfrRecord;
	/** whether the map has an outline for it, to fly to */
	onMap: boolean;
	onClose: () => void;
};

const TfrDetails: React.FC<DetailsProps> = ({ id, tfr, onMap, onClose }) => {
	const { data, isLoading, error } = useQuery(orpc.airspace.tfrs.details.queryOptions({
		input: { notam_id: id },
		queryKey: ["tfr", "details", id],
		enabled: Boolean(tfr)
	}));

	const parsed = useMemo(() => data ? parseTfrText(data.text, id) : null, [data, id]);

	const info = typeInfo(tfr?.type ?? "");
	const place = tfr ? placeOf(tfr.description) : null;
	const state = tfr ? (UsStateAbbreviations[tfr.state] ?? tfr.state) : null;
	const areas = parsed?.affected_areas?.areas ?? [];
	const contact = parsed?.pilots_may_contact
		?.split(/,\s([0-9]{3}-[0-9]{3}-[0-9]{4})$/g)
		.filter(Boolean)
		.join(" · ");

	return (
		<div className="flex min-h-0 flex-col">
			<div className="flex shrink-0 items-start gap-3 p-3">
				<div
					className="flex size-10 shrink-0 items-center justify-center rounded-md"
					style={{ backgroundColor: `${info.color}26` }}
				>
					<info.icon className="size-5" style={{ color: info.color }} />
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1">
						<span className="font-mono text-lg leading-tight font-semibold tracking-tight">{id}</span>
						<Tip label="Copy the NOTAM number">
							<CopyButton value={id} variant="ghost" size="icon-sm" className="size-6 text-muted-foreground" iconSize="size-3.5" />
						</Tip>
						{tfr && isNew(tfr) && <Badge variant="blue" className="ml-1 rounded-sm px-1.5 py-0 text-[10px]">New</Badge>}
					</div>
					<div className="truncate text-xs text-muted-foreground">
						{tfr ? <>{info.label} · {place}{state && <>, {state}</>}</> : "TFR"}
					</div>
				</div>

				<div className="flex shrink-0 items-center">
					<Tip label="Open on the FAA's site">
						<Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" aria-label="Open on the FAA's site" asChild>
							<a href={faaUrl(id)} target="_blank" rel="noopener noreferrer">
								<SquareArrowOutUpRight className="size-3.5" />
							</a>
						</Button>
					</Tip>
					<Tip label="Close">
						<Button variant="ghost" size="icon-sm" className="size-7 text-muted-foreground" aria-label="Close" onClick={onClose}>
							<X className="size-4" />
						</Button>
					</Tip>
				</div>
			</div>

			<ScrollArea
				className="min-h-0 border-t"
				viewportClassName="max-h-[max(10rem,calc(var(--page-height)*var(--tfr-split)-8.5rem))]"
			>
				{!tfr && (
					<div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
						<div className="rounded-lg bg-amber-200 p-2 dark:bg-amber-700">
							<TriangleAlert className="size-5" />
						</div>
						<div className="text-sm font-medium">{id} isn&apos;t active</div>
						<Muted>This one has ended or been cancelled since the link was made.</Muted>
					</div>
				)}

				{tfr && (
					<>
						<p className="mx-3 my-3 rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed text-muted-foreground">
							{info.description}
						</p>

						<Section title="When">
							{datesOf(tfr.description) && <Row label="Dates" value={datesOf(tfr.description)} />}
							{parsed?.beginning_date_and_time && <Row label="Starts" value={parsed.beginning_date_and_time} />}
							{parsed?.ending_date_and_time && <Row label="Until" value={parsed.ending_date_and_time} />}
							<Row label="Updated" value={formatModified(tfr.mod_date)} />
							{parsed?.issue_date && <Row label="Issued" value={parsed.issue_date} />}
							{parsed?.replaced_notams && parsed.replaced_notams !== "N/A" && (
								<Row label="Replaces" value={parsed.replaced_notams} />
							)}
						</Section>

						<Section title="Where">
							<div className="flex items-start justify-between gap-2">
								<div className="grid min-w-0 flex-1 gap-2">
									<Row label="Place" value={parsed?.location?.split(" near")[0] ?? `${place}, ${tfr.state}`} />
									<Row label="Region" value={state} />
									<Row
										label="Center"
										value={`${tfr.facility} · ${AirspaceLocalizations[tfr.facility] ?? tfr.facility} Center`}
									/>
								</div>

								{onMap && (
									<Tip label="Jump to it on the map">
										<Button
											variant="outline"
											size="icon-sm"
											className="size-7 shrink-0"
											aria-label="Jump to it on the map"
											onClick={() => useTfrControls.getState().select(id, true)}
										>
											<Navigation className="size-3.5 dark:text-muted-foreground" />
										</Button>
									</Tip>
								)}
							</div>

							{!onMap && <Muted>The FAA hasn&apos;t published an outline for this one, so it isn&apos;t drawn on the map.</Muted>}

							{areas.length > 0 && (
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{areas.map((area, i) => {
										const circular = "center" in area;

										return (
											<div key={i} className="grid min-w-0 gap-1 rounded-md border border-dashed bg-muted/50 p-2">
												<div className="text-xs font-semibold">{circular ? area.name : `Area ${i + 1}`}</div>
												{circular && <div className="font-mono text-[11px] wrap-anywhere">{area.center}</div>}
												{circular && area.radius && (
													<div className="flex gap-2 text-xs">
														<span className="text-muted-foreground">Radius</span>
														<span className="font-mono">{area.radius}</span>
													</div>
												)}
												{area.altitude && (
													<div className="text-[11px] leading-snug text-muted-foreground">
														{area.altitude.replace(/^[\s\S]*Altitude:\s*/, "")}
													</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</Section>

						{isLoading && (
							<Section title="Details">
								<div className="grid gap-3">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-2/3" />
									<Skeleton className="h-4 w-3/4" />
								</div>
							</Section>
						)}

						{!isLoading && error && (
							<Section title="Details">
								<Muted>We couldn&apos;t load the rest of this NOTAM. The FAA&apos;s page has it.</Muted>
							</Section>
						)}

						{parsed?.reason_for_notam && (
							<Section title="Reason">
								<p className="text-xs leading-relaxed">{parsed.reason_for_notam}</p>
							</Section>
						)}

						{parsed?.operating_restrictions && (
							<Section title="Restrictions">
								<pre className="rounded-md bg-muted/50 p-2.5 font-mono text-[11px] leading-relaxed wrap-anywhere whitespace-pre-wrap">
									{parsed.operating_restrictions}
								</pre>
							</Section>
						)}

						{(parsed?.authority || contact || parsed?.point_of_contact) && (
							<Section title="Contact">
								{parsed?.authority && <Row label="Authority" value={parsed.authority} />}
								{parsed?.point_of_contact && <Row label="Office" value={parsed.point_of_contact} />}
								{parsed?.telephone && <Row label="Phone" value={parsed.telephone} />}
								{parsed?.frequency && <Row label="Radio" value={parsed.frequency} />}
								{contact && <Row label="Pilots" value={contact} />}
							</Section>
						)}

						{parsed?.full_notam_text && (
							<section className="border-t px-3 py-3">
								<details className="group">
									<summary className="cursor-pointer font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase select-none hover:text-foreground">
										Full NOTAM text
									</summary>
									<pre className="mt-2 rounded-md bg-muted/50 p-2.5 font-mono text-[11px] leading-relaxed wrap-anywhere whitespace-pre-wrap">
										{parsed.full_notam_text}
									</pre>
								</details>
							</section>
						)}
					</>
				)}
			</ScrollArea>
		</div>
	);
};

/** The floating panel over the map: the TFR that's open. Esc closes it. */
export const TfrPanel: React.FC<{ index: TfrIndex; ready: boolean }> = ({ index, ready }) => {
	const selectedId = useTfrControls(state => state.selectedId);
	const { clear } = useTfrControls.getState();

	useKeyHandler({
		"escape": event => {
			// the table's search box closes itself on Esc: that one press shouldn't also close the panel
			const target = event.target;
			if (target instanceof HTMLInputElement && target.closest('[data-slot="grid-wrapper"]')) return;

			if (useTfrControls.getState().selectedId) clear();
		}
	}, true);

	if (!selectedId || !ready) return null;

	return (
		<div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-2 lg:right-auto lg:w-96">
			<div className="pointer-events-auto overflow-hidden rounded-lg border bg-background/90 shadow-lg backdrop-blur">
				<TfrDetails
					key={selectedId}
					id={selectedId}
					tfr={index.records.get(selectedId)}
					onMap={index.items.has(selectedId)}
					onClose={clear}
				/>
			</div>
		</div>
	);
};
