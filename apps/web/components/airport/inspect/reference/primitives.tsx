"use client";

import { cn } from "cnfast";
import { Check, ExternalLink, Minus, X } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";
import { CopyButton } from "~/components/ui/copy-button";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Decoded } from "./decode";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from "~/components/ui/tooltip";

/** Card chrome matching the Operations tab cards (title row + bordered body). */
export const ReferenceCard: React.FC<PropsWithChildren<{
	title: string;
	/** Count badge at the right of the title row (same chip as the airspace page cards). */
	meta?: ReactNode;
	/** Controls shown at the right of the title row, before the badge (e.g. a view toggle). */
	actions?: ReactNode;
	className?: string;
}>> = ({ title, meta, actions, className, children }) => (
	<section className={cn("border-b border-border min-w-0", className)}>
		<div className="flex flex-row items-center justify-between px-3 py-2 border-b">
			<span className="text-md font-semibold pointer-events-none">{title}</span>
			<div className="flex items-center gap-2">
				{actions}
				{meta != null && (
					<div className="flex px-2 text-sm items-center rounded-sm bg-zinc-300 dark:bg-zinc-800 font-mono tabular-nums pointer-events-none">
						{meta}
					</div>
				)}
			</div>
		</div>
		{children}
	</section>
);

export const Fields: React.FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
	<dl className={cn("divide-y", className)}>{children}</dl>
);

export const Field: React.FC<PropsWithChildren<{ label: string; mono?: boolean }>> = ({ label, mono, children }) => (
	<div className="flex min-h-10 flex-row items-center justify-between gap-4 px-3 py-1.5 text-sm">
		<dt className="shrink-0 text-muted-foreground">{label}</dt>
		<dd className={cn("min-w-0 text-right wrap-break-word", mono && "font-mono")}>{children}</dd>
	</div>
);

export const NoValue: React.FC<{ children?: ReactNode }> = ({ children = "—" }) => (
	<span className="text-muted-foreground">{children}</span>
);

/** A value with a one-click copy affordance, for codes people paste elsewhere. */
export const CopyableCode: React.FC<{ value: string | null | undefined }> = ({ value }) => {
	if (!value) return <NoValue />;
	return (
		<span className="inline-flex items-center gap-1">
			<span className="font-mono">{value}</span>
			<CopyButton value={value} variant="ghost" size="icon-sm" className="size-6 text-muted-foreground" iconSize="size-3" />
		</span>
	);
};

/** A decoded FAA code: readable label, with the raw code (and any detail) in a tooltip. */
export const DecodedValue: React.FC<{ decoded: Decoded | null | undefined; className?: string }> = ({ decoded, className }) => {
	if (!decoded) return <NoValue />;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className={cn("cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-4", className)}>
					{decoded.label}
				</span>
			</TooltipTrigger>
			<TooltipContent side="top" className="max-w-64">
				<div className="space-y-1">
					{decoded.detail && <div>{decoded.detail}</div>}
					<div className="font-mono opacity-80">Code: {decoded.raw || "—"}</div>
					{!decoded.known && <div className="opacity-80">Definition unavailable</div>}
				</div>
			</TooltipContent>
		</Tooltip>
	);
};

/** Yes / No / Unknown, for nullable booleans. */
export const BooleanValue: React.FC<{ value: boolean | null | undefined; yes?: string; no?: string }> = ({
	value,
	yes = "Yes",
	no = "No",
}) => {
	if (value == null) return (
		<span className="inline-flex items-center gap-1 text-muted-foreground">
			<Minus className="size-3.5" /> Unknown
		</span>
	);
	return value ? (
		<span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
			<Check className="size-3.5" /> {yes}
		</span>
	) : (
		<span className="inline-flex items-center gap-1 text-muted-foreground">
			<X className="size-3.5" /> {no}
		</span>
	);
};

export const ExternalAnchor: React.FC<{ href: string; children: ReactNode }> = ({ href, children }) => (
	<a
		href={href}
		target="_blank"
		rel="noopener noreferrer"
		className="inline-flex items-center gap-1 hover:underline underline-offset-4"
	>
		{children}
		<ExternalLink className="size-3 shrink-0 text-muted-foreground" />
	</a>
);

/** Small pill, for lists of codes / fuels / keywords. */
export const Chip: React.FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
	<span className={cn("inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-mono", className)}>
		{children}
	</span>
);

/**
 * Scroll wrapper for the reference tables: the shared ScrollArea (edge masks), height-capped like the other airport
 * cards, scrolling both ways since several tables are wider than their card.
 * The cap goes on the viewport: a max-height on the root never makes the viewport's `size-full` height definite,
 * so it would clip instead of scroll. The horizontal ScrollBar is what enables sideways scrolling in Radix.
 */
export const TableScroll: React.FC<PropsWithChildren> = ({ children }) => (
	<ScrollArea maskHeight={20} viewportClassName="max-h-(--panel-height)">
		{children}
		<ScrollBar orientation="horizontal" />
	</ScrollArea>
);

export const Th: React.FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
	<th className={cn("sticky top-0 z-10 bg-background px-3 py-1.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b", className)}>
		{children}
	</th>
);

export const Td: React.FC<PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
	<td className={cn("px-3 py-1.5 align-top text-sm whitespace-nowrap", className)}>{children}</td>
);
