"use client";

// Modified to have controlled state
// https://motion-primitives.com/docs/animated-background

import { cn } from "~/lib/utils";
import { AnimatePresence, Transition, motion } from "motion/react";
import {
	Children,
	cloneElement,
	ReactElement,
	useId,
} from "react";

export type AnimatedBackgroundProps = {
	children:
		| ReactElement<{ "data-id": number }>[]
		| ReactElement<{ "data-id": number }>;
	value: number | null;
	defaultValue: number;
	setActiveValue: (newActiveId: number | null) => void;
	className?: string;
	transition?: Transition;
	enableHover?: boolean;
};

export function AnimatedBackground({
	children,
	value,
	defaultValue,
	setActiveValue,
	className,
	transition,
	enableHover = false,
}: AnimatedBackgroundProps) {
	const uniqueId = useId();

	const handleSetActiveId = (id: number | null) => {
		setActiveValue(id);
	};

	return Children.map(children, (child: any, index) => {
		const id = child.props["data-id"];

		const interactionProps = enableHover
			? {
					onMouseEnter: () => handleSetActiveId(id),
					onMouseLeave: () => handleSetActiveId(null),
				}
			: {
					onClick: () => handleSetActiveId(id),
				};

		return cloneElement(
			child,
			{
				key: index,
				className: cn("relative inline-flex", child.props.className),
				"data-checked": value === id ? "true" : "false",
				...interactionProps,
			},
			<>
				<AnimatePresence initial={false}>
					{value === id && (
						<motion.div
							layoutId={`background-${uniqueId}`}
							className={cn("absolute inset-0", className)}
							transition={transition}
							initial={{ opacity: defaultValue ? 1 : 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						/>
					)}
				</AnimatePresence>
				<div className="z-10">{child.props.children}</div>
			</>,
		);
	});
}
