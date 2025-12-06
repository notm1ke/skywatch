"use client";

// Modified to be origin-aware and have other special properties.
// Originally from https://motion-primitives.com/docs/morphing-popover

import type React from "react";

import { cn } from "~/lib/utils";
import { createPortal } from "react-dom";
import { useClickOutside } from "~/hooks/use-click-outside";

import {
	AnimatePresence,
	AnimationGeneratorType,
	MotionConfig,
	motion,
	type Transition,
	type Variants,
} from "motion/react";

import {
	useState,
	useId,
	useRef,
	useEffect,
	createContext,
	useContext,
	isValidElement,
	RefObject,
} from "react";

const TRANSITION = {
	type: "spring" as AnimationGeneratorType,
	bounce: 0.1,
	duration: 0.5,
};

type SearchContextValue = {
	isOpen: boolean;
	open: () => void;
	close: () => void;
	uniqueId: string;
	variants?: Variants;
	triggerRect: DOMRect | null;
	setTriggerRect: (rect: DOMRect | null) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

function usePopoverLogic({
	defaultOpen = false,
	open: controlledOpen,
	onOpenChange,
}: {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
} = {}) {
	const uniqueId = useId();
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

	const isOpen = controlledOpen ?? uncontrolledOpen;

	const open = () => {
		if (controlledOpen === undefined) {
			setUncontrolledOpen(true);
		}
		onOpenChange?.(true);
	};

	const close = () => {
		if (controlledOpen === undefined) {
			setUncontrolledOpen(false);
		}
		onOpenChange?.(false);
	};

	return { isOpen, open, close, uniqueId, triggerRect, setTriggerRect };
}

export type SearchProps = {
	children: React.ReactNode;
	transition?: Transition;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	variants?: Variants;
	className?: string;
} & React.ComponentProps<"div">;

function Search({
	children,
	transition = TRANSITION,
	defaultOpen,
	open,
	onOpenChange,
	variants,
	className,
	...props
}: SearchProps) {
	const popoverLogic = usePopoverLogic({ defaultOpen, open, onOpenChange });

	return (
		<SearchContext.Provider value={{ ...popoverLogic, variants }}>
			<MotionConfig transition={transition}>
				<div
					className={cn(
						"relative flex items-center justify-center",
						className,
					)}
					key={popoverLogic.uniqueId}
					{...props}
				>
					{children}
				</div>
			</MotionConfig>
		</SearchContext.Provider>
	);
}

export type SearchTriggerProps = {
	asChild?: boolean;
	children: React.ReactNode;
	className?: string;
	triggerRef: RefObject<HTMLDivElement | null>;
} & React.ComponentProps<typeof motion.button>;

function SearchTrigger({
	children,
	className,
	asChild = false,
	triggerRef,
	...props
}: SearchTriggerProps) {
	const context = useContext(SearchContext);
	if (!context) {
		throw new Error(
			"MorphingPopoverTrigger must be used within MorphingPopover",
		);
	}
	
	useEffect(() => {
		if (triggerRef?.current) {
			const rect = triggerRef.current.getBoundingClientRect()
			context.setTriggerRect(rect)
		}
	}, [triggerRef]);

	useEffect(() => {
		window.addEventListener('resize', () => {
			if (triggerRef.current) {
				const rect = triggerRef.current.getBoundingClientRect()
				context.setTriggerRect(rect)
			}
		})
	}, []);
	
	const handleClick = () => context.open();

	if (asChild && isValidElement(children)) {
		const MotionComponent = motion.create(
			children.type as React.ForwardRefExoticComponent<any>,
		);
		const childProps = children.props as Record<string, unknown>;

		return (
			<MotionComponent
				{...childProps}
				ref={triggerRef}
				onClick={handleClick}
				layoutId={`popover-trigger-${context.uniqueId}`}
				key={context.uniqueId}
				aria-expanded={context.isOpen}
				aria-controls={`popover-content-${context.uniqueId}`}
			/>
		);
	}

	return (
		<motion.div
			ref={triggerRef}
			key={context.uniqueId}
			layoutId={`popover-trigger-${context.uniqueId}`}
			onClick={handleClick}
		>
			<motion.button
				{...props}
				layoutId={`popover-label-${context.uniqueId}`}
				key={context.uniqueId}
				className={className}
				aria-expanded={context.isOpen}
				aria-controls={`popover-content-${context.uniqueId}`}
			>
				{children}
			</motion.button>
		</motion.div>
	);
}

export type SearchContentProps = {
	children: React.ReactNode;
	className?: string;
} & React.ComponentProps<typeof motion.div>;

function SearchContent({
	children,
	className,
	...props
}: SearchContentProps) {
	const context = useContext(SearchContext);
	if (!context)
		throw new Error(
			"MorphingPopoverContent must be used within MorphingPopover",
		);

	const ref = useRef<HTMLDivElement>(null);
	const [contentDimensions, setContentDimensions] = useState<{
		width: number;
		height: number;
	}>({ width: 0, height: 0 });
	
	useClickOutside(ref, context.close);

	useEffect(() => {
		if (!context.isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") context.close();
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [context.isOpen, context.close]);
	
	useEffect(() => {
		if (context.isOpen && ref.current && (!contentDimensions?.height || !contentDimensions?.width)) {
			const contentRect = ref.current.getBoundingClientRect();
			setContentDimensions({
				width: contentRect.width,
				height: contentRect.height,
			});
		}
	}, [context.isOpen, children, contentDimensions]);
	
	const style: React.CSSProperties =
		context.triggerRect && contentDimensions.width > 0
			? (() => {
					const trigger = context.triggerRect;
					const content = contentDimensions;
					const centerX =
						trigger.left + trigger.width / 2 - content.width / 2;
					const idealTop =
						trigger.top + trigger.height / 2 - content.height / 2;
					const maxUpwardExpansion = 5;
					const constrainedTop = Math.max(
						trigger.top - maxUpwardExpansion,
						idealTop,
					);
					
					return {
						position: "fixed",
						top: constrainedTop,
						left: centerX,
						transformOrigin: "center",
					};
				})()
			: {};

	return (
		<AnimatePresence>
			{context.isOpen && (
				<>
					{typeof document !== "undefined" &&
						createPortal(
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.2 }}
								onClick={context.close}
								className="fixed inset-0 z-[9] bg-black/50 backdrop-blur-xs"
								data-backdrop="true"
								aria-hidden="true"
							/>,
							document.body,
						)}
					<motion.div
						{...props}
						ref={ref}
						layoutId={`popover-trigger-${context.uniqueId}`}
						key={context.uniqueId}
						id={`popover-content-${context.uniqueId}`}
						role="dialog"
						aria-modal="true"
						style={style}
						className={cn(
							"absolute z-10 overflow-hidden rounded-md border border-zinc-950/10 bg-white p-2 text-zinc-950 shadow-md dark:border-zinc-50/10 dark:bg-zinc-700 dark:text-zinc-50",
							className,
						)}
						initial="initial"
						animate="animate"
						exit="exit"
						variants={context.variants}
					>
						{children}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

export { Search, SearchTrigger, SearchContent };
