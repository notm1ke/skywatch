import Link from "next/link";

import { cn } from "~/lib/utils";
import { useState } from "react";
import { TabType } from "~/lib/page";
import { motion } from "motion/react";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

export type AnimatedTabsProps = {
	items: AnimatedTabItem[];
	defaultValue: string;
	onChange: (item: AnimatedTabItem) => void;
};

export type AnimatedTabItem = {
	content: string;
	tabType: TabType;
	href: string;
};

type TabButtonProps = {
	active: AnimatedTabItem,
	item: AnimatedTabItem,
	setActive: (item: AnimatedTabItem) => void,
	activeHover: AnimatedTabItem | null,
	setActiveHover: (item: AnimatedTabItem | null) => void,
	onChange: (item: AnimatedTabItem) => void,
}

const TabButton: React.FC<TabButtonProps> = ({
	active,
	item,
	setActive,
	activeHover,
	setActiveHover,
	onChange,
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
			<div className="px-3 py-1 relative">
				{typeof item.content === 'string' && (
					<span className="">
						{item.content}
					</span>
				)}
				{typeof item.content === 'function' && item.content}
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

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({ items, onChange }) => {
	const pathname = usePathname();
	const [activeHover, setActiveHover] = useState<AnimatedTabItem | null>(null);
	const [active, setActive] = useState<AnimatedTabItem>(() => {
		let path = pathname;
		if (pathname.split('/').length > 2)
			path = '/' + pathname.split('/')[1];
		
		return items.find((item) => item.href === path) || items[0];
	});
	
	return (
		<ul className="flex items-center px-2">
			{items.map((item) => (
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
						onChange
					}} />
				</Link>
			))}
		</ul>
	);
};
