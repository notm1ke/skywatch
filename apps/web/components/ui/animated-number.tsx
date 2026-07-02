"use client";
import { cn } from "cnfast";
import { motion, SpringOptions, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

export type AnimatedNumberProps = {
	value: number;
	className?: string;
	springOptions?: SpringOptions;
	as?: React.ElementType;
	from?: number;
};

export function AnimatedNumber({
	value,
	className,
	springOptions,
	as = "span",
	from = 0,
}: AnimatedNumberProps) {
	// @ts-expect-error lib type issue
	const MotionComponent = motion.create<HTMLSpanElement>(as as keyof JSX.IntrinsicElements);

	const spring = useSpring(from, springOptions);
	const display = useTransform(spring, (current) =>
		Math.round(current).toLocaleString(),
	);

	useEffect(() => {
		spring.set(value);
	}, [spring, value]);

	return (
		<MotionComponent className={cn("tabular-nums", className)}>
			{display}
		</MotionComponent>
	);
}
