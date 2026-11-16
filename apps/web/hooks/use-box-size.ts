import { useEffect, useRef, useState } from "react";

/**
 * The size of the box an element fills, kept up to date (null until it's been measured). For things drawn at the size of
 * their box, like a treemap or a map, rather than scaled to fit it.
 */
export const useBoxSize = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState<{ width: number; height: number } | null>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			// rounded down: a layout one pixel wider than its box would spill out of it
			setSize({ width: Math.floor(width), height: Math.floor(height) });
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return [ref, size] as const;
};
