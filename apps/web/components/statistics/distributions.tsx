"use client";

import { cn } from "cnfast";
import { useState } from "react";
import { Cell as SliceCell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { OTHER_KEY, STRIPES, withOthers, type TreemapSlice } from "~/components/ui/treemap";

import {
	Legend,
	percent,
	type LegendItem
} from "./shared";

/**
 * Four ways to show how a whole divides into parts, so the page doesn't draw every share the same way:
 * a treemap (many parts, a long tail), lollipops (a ranking), a ribbon (one bar, a few big parts) and a donut (one part
 * that's most of it). Each takes the same kind of slice and the same hover: pointing at a slice, or at its row in a
 * legend, picks it out and dims the rest. They work from the keyboard too.
 */
export type Slice = TreemapSlice;
export { OTHER_KEY, STRIPES, withOthers };

const legendOf = (slices: Slice[], total: number): LegendItem[] => slices.map(slice => ({
	key: slice.key,
	label: slice.label,
	hint: slice.hint,
	share: slice.value / Math.max(1, total),
	color: slice.color
}));

// The treemap is shared with the airspace and airport pages: it lives in `components/ui/treemap.tsx`.
export { Treemap } from "~/components/ui/treemap";

// --- lollipops -----------------------------------------------------------------------------------------------

export const Lollipops: React.FC<{ slices: Slice[]; total: number; label: string }> = ({ slices, total, label }) => {
	const [active, setActive] = useState<string | null>(null);
	const max = Math.max(1, ...slices.map(slice => slice.value));

	return (
		<ul role="list" aria-label={label} className="m-0 list-none p-0" onMouseLeave={() => setActive(null)}>
			{slices.map(slice => {
				const reach = (slice.value / max) * 100;

				return (
					<li
						key={slice.key}
						tabIndex={0}
						onMouseEnter={() => setActive(slice.key)}
						onFocus={() => setActive(slice.key)}
						onBlur={() => setActive(null)}
						className={cn(
							"flex items-center gap-3 rounded-sm py-1.5 outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring/60",
							active && active !== slice.key && "opacity-40"
						)}
					>
						<div className="w-32 shrink-0 sm:w-52">
							<div className="font-mono text-sm leading-tight font-medium">{slice.label}</div>
							{slice.hint && <div className="truncate text-xs leading-tight text-muted-foreground">{slice.hint}</div>}
						</div>

						<div className="relative h-4 min-w-0 flex-1">
							<div className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full" style={{ width: `${reach}%`, background: slice.color, opacity: 0.45 }} />
							<div
								className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
								style={{ left: `${Math.max(2, reach)}%`, background: slice.color }}
							/>
						</div>

						<span className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">{percent(slice.value / Math.max(1, total))}</span>
					</li>
				);
			})}
		</ul>
	);
};

// --- ribbon ----------------------------------------------------------------------------------------------------

export const Ribbon: React.FC<{ slices: Slice[]; total: number; label: string }> = ({ slices, total, label }) => {
	const [active, setActive] = useState<string | null>(null);

	return (
		<div>
			<div role="group" aria-label={label} className="flex h-14 gap-[3px]" onMouseLeave={() => setActive(null)}>
				{slices.map(slice => {
					const share = slice.value / Math.max(1, total);
					const other = slice.key === OTHER_KEY;

					return (
						<div
							key={slice.key}
							tabIndex={0}
							role="img"
							aria-label={`${slice.label}: ${percent(share)}`}
							onMouseEnter={() => setActive(slice.key)}
							onFocus={() => setActive(slice.key)}
							onBlur={() => setActive(null)}
							className={cn(
								"flex min-w-[3px] flex-col justify-end overflow-hidden rounded-[3px] p-1.5 outline-none transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-ring",
								other ? "text-foreground" : "text-zinc-900",
								active && active !== slice.key && "opacity-30"
							)}
							style={{ flexGrow: slice.value, flexBasis: 0, background: other ? STRIPES : slice.color }}
						>
							{share >= 0.07 && (
								<>
									<span className="truncate font-mono text-xs leading-tight font-bold">{other ? "Others" : slice.label}</span>
									<span className="font-mono text-[11px] leading-tight opacity-75 tabular-nums">{percent(share, 0)}</span>
								</>
							)}
						</div>
					);
				})}
			</div>

			<Legend className="mt-5 grid gap-x-8 sm:grid-cols-2" items={legendOf(slices, total)} active={active} onActive={setActive} />
		</div>
	);
};

// --- donut -----------------------------------------------------------------------------------------------------

export const Donut: React.FC<{ slices: Slice[]; total: number; label: string; centerLabel: string }> = ({ slices, total, label, centerLabel }) => {
	const [active, setActive] = useState<string | null>(null);
	const slice = slices.find(entry => entry.key === active);

	return (
		<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
			<div role="img" aria-label={label} className="relative mx-auto size-52 shrink-0 sm:mx-0 sm:size-56" onMouseLeave={() => setActive(null)}>
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={slices}
							dataKey="value"
							nameKey="label"
							innerRadius="66%"
							outerRadius="100%"
							paddingAngle={2}
							stroke="none"
							startAngle={90}
							endAngle={-270}
							isAnimationActive={false}
							onMouseEnter={(_, index) => setActive(slices[index]?.key ?? null)}
						>
							{slices.map(entry => (
								<SliceCell key={entry.key} fill={entry.color} fillOpacity={active && active !== entry.key ? 0.25 : entry.key === OTHER_KEY ? 0.5 : 1} />
							))}
						</Pie>
					</PieChart>
				</ResponsiveContainer>

				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
					{/* the whole until a kind is picked out, then that kind's share */}
					<div className="font-mono text-2xl font-semibold tabular-nums">{slice ? percent(slice.value / Math.max(1, total), 1) : total.toLocaleString()}</div>
					<div className="max-w-28 text-xs leading-tight text-muted-foreground">{slice ? slice.label : centerLabel}</div>
				</div>
			</div>

			<Legend className="flex-1" items={legendOf(slices, total)} active={active} onActive={setActive} />
		</div>
	);
};
