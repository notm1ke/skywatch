"use client";

/** the most squares a row gets */
const MAX_SQUARES = 36;

/** The value a square stands for: the biggest row fits the space, rounded up to a number that reads well. */
export const unitFor = (max: number, squares = MAX_SQUARES) => {
	const raw = max / squares;
	const step = raw >= 1000 ? 500 : raw >= 100 ? 50 : raw >= 10 ? 5 : 1;
	return Math.max(step, Math.ceil(raw / step) * step);
};

/**
 * A row of squares, one for every `unit` of `value`, the last one only as full as what's left over. They shrink to fit
 * the row, so a long one never pushes the numbers beside it off a small screen.
 */
export const Squares: React.FC<{ value: number; unit: number; color: string }> = ({ value, unit, color }) => {
	const exact = value / unit;
	const count = Math.max(1, Math.ceil(exact));

	return (
		<div className="flex min-w-0 flex-1 gap-[3px]">
			{Array.from({ length: count }, (_, index) => {
				// the last square is only as full as the remainder
				const fill = index === count - 1 ? exact - index : 1;

				return (
					<span
						key={index}
						className="aspect-square max-w-3.5 min-w-0 flex-1 rounded-[2px]"
						style={{
							background: fill >= 0.995
								? color
								: `linear-gradient(to right, ${color} ${Math.round(fill * 100)}%, color-mix(in oklab, ${color} 22%, transparent) ${Math.round(fill * 100)}%)`
						}}
					/>
				);
			})}
		</div>
	);
};
