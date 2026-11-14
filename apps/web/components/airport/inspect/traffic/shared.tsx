"use client";

import moment from "moment-timezone";

import { cn } from "cnfast";
import { ReactNode } from "react";
import { gateway } from "~/lib/gateway";
import { UseQueryResult } from "@tanstack/react-query";
import { Skeleton } from "~/components/ui/skeleton";
import { ScrollArea } from "~/components/ui/scroll-area";
import { ErrorSection } from "~/components/error-section";

/** Response types, inferred from the gateway so they can't drift from the endpoints. */
export type TrafficSummary = Awaited<ReturnType<typeof gateway.traffic.airport.summary>>;
export type TrafficDemand = Awaited<ReturnType<typeof gateway.traffic.airport.demand>>;
export type TrafficMix = Awaited<ReturnType<typeof gateway.traffic.airport.mix>>;
export type TrafficHistory = Awaited<ReturnType<typeof gateway.traffic.airport.history>>;

export type Query<T> = Pick<UseQueryResult<T, Error>, "data" | "isLoading" | "error" | "refetch">;

/** FAA bucket times are Zulu. "0345" -> "03:45Z" */
export const zuluLabel = (time: string) => `${time.slice(0, 2)}:${time.slice(2)}Z`;
export const hourLabel = (time: string) => `${time.slice(0, 2)}Z`;

export const formatDay = (date: string) => moment.utc(date).format("ddd, MMM D, YYYY");

export const todayZulu = () => new Date().toISOString().slice(0, 10);

/** The same instant as a Zulu bucket, on the airport's own clock. */
export const localClock = (date: string, time: string, timezone: string | null | undefined) => {
	if (!timezone) return null;
	return moment.utc(`${date}T${time.slice(0, 2)}:${time.slice(2)}`).tz(timezone).format("h:mm A z");
};

/**
 * An ISO instant as Zulu (with the date when it isn't on `day`) plus the airport's local clock.
 * e.g. { zulu: "Sep 25 14:40Z", local: "10:40 AM EDT" }
 */
export const instantLabel = (iso: string, day: string, timezone: string | null | undefined) => {
	const instant = moment.utc(iso);
	return {
		zulu: instant.format(instant.format("YYYY-MM-DD") === day ? "HH:mm[Z]" : "MMM D HH:mm[Z]"),
		local: timezone ? instant.tz(timezone).format("h:mm A z") : null
	};
};

export const formatDuration = (minutes: number | null | undefined) => {
	if (minutes == null) return "—";
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return h ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Loading skeleton / error boundary used inside each card body. */
export const QueryBody = <T,>({
	query,
	height = 200,
	title = "Couldn't load this chart",
	children
}: {
	query: Query<T>;
	height?: number;
	title?: string;
	children: (data: T) => ReactNode;
}) => {
	if (query.isLoading) return <div className="p-3"><Skeleton className="w-full" style={{ height }} /></div>;
	if (query.error || !query.data) return (
		<ErrorSection title={title} error={query.error?.message} refresh={() => query.refetch()} />
	);

	return <>{children(query.data)}</>;
};

export type BarItem = {
	key: string;
	label: ReactNode;
	hint?: ReactNode;
	value: number;
	color?: string;
	right?: ReactNode;
};

/** Horizontal bar rows, scaled to the largest value. */
export const BarList: React.FC<{ items: BarItem[]; empty?: string }> = ({ items, empty = "Nothing to show." }) => {
	if (!items.length) return <div className="px-3 py-3 text-sm text-muted-foreground">{empty}</div>;

	const max = Math.max(1, ...items.map(item => item.value));
	return (
		<ul className="divide-y">
			{items.map(item => (
				<li key={item.key} className="relative min-h-9 px-3 py-1.5 text-sm">
					<div
						className="absolute inset-y-0 left-0 opacity-20"
						style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? "var(--color-sky-400)" }}
					/>
					<div className="relative flex min-h-6 items-center justify-between gap-3">
						<span className="flex min-w-0 items-baseline gap-2">
							<span className="font-mono font-medium">{item.label}</span>
							{item.hint && <span className="truncate text-xs text-muted-foreground">{item.hint}</span>}
						</span>
						<span className={cn("shrink-0 font-mono tabular-nums")}>
							{item.right ?? item.value.toLocaleString()}
						</span>
					</div>
				</li>
			))}
		</ul>
	);
};

export const ChartLegend: React.FC<{ items: { label: string; color: string; dashed?: boolean }[] }> = ({ items }) => (
	<div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-2 text-xs text-muted-foreground">
		{items.map(item => (
			<span key={item.label} className="inline-flex items-center gap-1.5">
				<span
					className="inline-block h-2 w-3 rounded-sm"
					style={item.dashed
						? { borderTop: `2px dashed ${item.color}`, height: 0 }
						: { background: item.color }}
				/>
				{item.label}
			</span>
		))}
	</div>
);

/**
 * Card body that never contributes to its row's height: the content is taken out of flow (absolute) and
 * scrolls inside the card with the shared edge mask. Use inside a card that is `flex flex-col` and sits in a
 * row whose height is set by a sibling (see the grid in `index.tsx`). Below `lg` there's no row to match, so
 * it falls back to the shared panel height.
 */
export const BoundedBody: React.FC<{ children: ReactNode }> = ({ children }) => (
	<div className="relative min-h-(--panel-height) flex-1 lg:min-h-0">
		<div className="absolute inset-0">
			<ScrollArea maskHeight={20} className="h-full">
				{children}
			</ScrollArea>
		</div>
	</div>
);
