"use client";

import type React from "react";

import { cn } from "cnfast";
import { useState, useEffect } from "react";
import { Button, buttonVariants } from "./button";
import { motion, AnimatePresence } from "motion/react";
import { VariantProps } from "class-variance-authority";
import { Check, Copy, type LucideIcon } from "lucide-react";

export interface CopyButtonProps extends VariantProps<typeof buttonVariants> {
	value: string;
	icon?: LucideIcon;
	iconSize?: string;
	className?: string;
	animationDuration?: number;
	onCopy?: () => void;
}

export function CopyButton({
	value,
	icon: Icon = Copy,
	iconSize = "size-4",
	className,
	animationDuration = 1500,
	onCopy,
	...props
}: CopyButtonProps) {
	const [hasCopied, setHasCopied] = useState(false);

	useEffect(() => {
		if (hasCopied) {
			const timeout = setTimeout(() => {
				setHasCopied(false);
			}, animationDuration);

			return () => clearTimeout(timeout);
		}
	}, [hasCopied, animationDuration]);

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			await navigator.clipboard.writeText(value);
			setHasCopied(true);
			onCopy?.();
		} catch (error) {
			console.error("Failed to copy text: ", error);
		}
	};

	return (
		<Button className={cn(className, hasCopied && "cursor-not-allowed")} {...props}>
			<AnimatePresence mode="wait" initial={false}>
				<motion.span
					key={hasCopied ? "check" : "copy"}
					initial={{ opacity: 0, y: 2 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -2 }}
					transition={{ duration: 0.15 }}
					onClick={handleClick}
				>
					{hasCopied ? (
						<Check className={iconSize} />
					) : (
						<Icon className={iconSize} />
					)}
				</motion.span>
			</AnimatePresence>
		</Button>
	);
}