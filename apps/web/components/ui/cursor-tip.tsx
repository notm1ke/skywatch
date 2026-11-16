"use client";

import { ReactNode } from "react";

/**
 * A readout that follows the pointer: the same card as the airspace map's hover card (a themed popover with a stripe down
 * its edge in the color of what it's about), so every tooltip that isn't attached to an element looks like it. Flips to
 * the left near the right edge.
 */
export const CursorTip: React.FC<{ at: { x: number; y: number }; stripe?: string; children: ReactNode }> = ({ at, stripe, children }) => {
	const nearRightEdge = at.x > window.innerWidth - 300;
	// the treemaps sit at the bottom of their pages: near the bottom edge it opens upward instead of off the screen
	const nearBottomEdge = at.y > window.innerHeight - 170;

	return (
		<div
			className="pointer-events-none fixed z-50 flex max-w-72 items-stretch overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
			style={{
				left: nearRightEdge ? at.x - 16 : at.x + 16,
				top: nearBottomEdge ? at.y - 16 : at.y + 16,
				transform: `translate(${nearRightEdge ? "-100%" : "0"}, ${nearBottomEdge ? "-100%" : "0"})`
			}}
		>
			{stripe && <div className="w-1 shrink-0" style={{ background: stripe }} />}
			<div className="grid min-w-0 gap-0.5 px-3 py-2">{children}</div>
		</div>
	);
};

/** The first line: what it is. */
export const TipTitle: React.FC<{ children: ReactNode }> = ({ children }) => (
	<div className="font-mono text-sm font-bold">{children}</div>
);

/** A code and a name on one line, like the airspace card's "ATL Hartsfield-Jackson Atlanta". */
export const TipHeading: React.FC<{ code: ReactNode; name?: ReactNode }> = ({ code, name }) => (
	<div className="flex items-baseline gap-2">
		<span className="font-mono text-sm font-bold text-zinc-800 dark:text-zinc-400">{code}</span>
		{name && <span className="text-sm font-semibold">{name}</span>}
	</div>
);

/** A muted line under it. */
export const TipText: React.FC<{ children: ReactNode }> = ({ children }) => (
	<div className="text-xs text-muted-foreground">{children}</div>
);

export const TipLine: React.FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
	<div className="text-xs text-muted-foreground">
		{label}: <span className="font-medium text-foreground">{children}</span>
	</div>
);
