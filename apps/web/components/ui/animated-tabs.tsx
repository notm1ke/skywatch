import Link from "next/link";

import { cn } from "cnfast";
import { TabType } from "~/lib/page";
import { AnimatePresence, motion } from "motion/react";
import { useLinkStatus } from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Kbd } from "./kbd";

export type AnimatedTabsProps = {
	items: AnimatedTabItem[];
	defaultValue: string;
	onChange: (item: AnimatedTabItem) => void;
	showHints?: boolean;
};

export type AnimatedTabItem = {
	content: string;
	tabType: TabType;
	href: string;
	hint?: string;
};

type TabButtonProps = {
	active: AnimatedTabItem,
	item: AnimatedTabItem,
	setActive: (item: AnimatedTabItem) => void,
	activeHover: AnimatedTabItem | null,
	setActiveHover: (item: AnimatedTabItem | null) => void,
	onChange: (item: AnimatedTabItem) => void,
	showHints?: boolean,
	index?: number,
}

const TabButton: React.FC<TabButtonProps> = ({
	active,
	item,
	setActive,
	activeHover,
	setActiveHover,
	onChange,
	showHints,
	index = 0,
}) => {
	const { pending } = useLinkStatus();
	return (
		<button
			key={item.tabType}
			className={cn(
				"py-2 relative duration-300 transition-colors hover:!text-primary cursor-pointer",
				active.tabType === item.tabType
					? "text-primary"
					: "text-muted-foreground",
			)}
			onClick={() => {
				setActive(item);
				onChange(item);
			}}
			onMouseEnter={() => setActiveHover(item)}
			onMouseLeave={() => setActiveHover(null)}
		>
			<div className="px-3 py-1 relative flex items-center gap-1.5">
				{typeof item.content === 'string' && (
					<span className="">
						{item.content}
					</span>
				)}
				{typeof item.content === 'function' && item.content}
				<AnimatePresence>
					{showHints && item.hint && (
						<motion.div
							key="hint"
							initial={{ width: 0, opacity: 0, filter: "blur(4px)" }}
							animate={{ width: "auto", opacity: 1, filter: "blur(0px)" }}
							exit={{ width: 0, opacity: 0, filter: "blur(4px)" }}
							transition={{ duration: 0.18, delay: index * 0.03, ease: "easeOut" }}
							className="overflow-hidden"
						>
							<Kbd>⌥{item.hint}</Kbd>
						</motion.div>
					)}
				</AnimatePresence>
				{activeHover?.tabType === item.tabType && (
					<motion.div
						layoutId="hover-bg"
						className="absolute bottom-0 left-0 right-0 w-full h-full bg-primary/10"
						style={{
							borderRadius: 6,
						}}
					/>
				)}
			</div>
			{active.tabType === item.tabType && (
				<motion.div
					layoutId="active"
					className={cn(
						"absolute bottom-0 left-0 right-0 w-full h-0.5 bg-primary",
						pending && "animate-pulse"
					)}
				/>
			)}
		</button>
	)
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({ items, onChange, showHints }) => {
	const pathname = usePathname();
	const [activeHover, setActiveHover] = useState<AnimatedTabItem | null>(null);
	
	const detectActiveTab = () => {
		let path = pathname;
		if (pathname.split('/').length > 2)
			path = '/' + pathname.split('/')[1];
		
		return items.find((item) => item.href === path) || items[0];
	} 
	
	const [active, setActive] = useState<AnimatedTabItem>(() => detectActiveTab());
	
	useEffect(() => {
		const active = detectActiveTab();
		setActive(active);
	}, [pathname]);
	
	return (
		<ul className="flex items-center px-2 overflow-x-scroll sm:overflow-x-auto">
			{items.map((item, index) => (
				<Link
					prefetch
					key={item.href}
					href={item.href}
				>
					<TabButton {...{
						active,
						item,
						setActive,
						activeHover,
						setActiveHover,
						onChange,
						showHints,
						index,
					}} />
				</Link>
			))}
		</ul>
	);
};
