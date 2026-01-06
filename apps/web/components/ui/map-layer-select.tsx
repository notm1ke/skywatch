"use client";

import { Skeleton } from "./skeleton";
import { PropsWithChildren } from "react";
import { MapLayers } from "./map-controls";
import { Circle, Check } from "lucide-react";
import { shortNumberFormatter } from "~/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./dropdown-menu";

interface MapLayerSelectorProps {
	items: MapLayers;
	selectedKeys: Set<string>;
	onSelectionChange: (selectedKeys: Set<string>) => void;
	side: "top" | "bottom" | "left" | "right";
}

export function MapLayerSelector({ items, selectedKeys, onSelectionChange, children, side }: PropsWithChildren<MapLayerSelectorProps>) {
	const padding = 4;
	const maxNameWidth = Math.max(...items.map(item => item.name.length));
	const maxCountWidth = Math.max(...items.map(item => shortNumberFormatter.format(item.count).length));
	const width = `${Math.max(maxNameWidth + maxCountWidth + padding, 16)}ch`;

	const handleToggleItem = (key: string) => {
		const newSelected = new Set(selectedKeys);
		if (newSelected.has(key)) {
			newSelected.delete(key);
		} else {
			newSelected.add(key);
		}
		
		onSelectionChange(newSelected);
	};

	return (
		<DropdownMenu>
			<Tooltip>
				<DropdownMenuTrigger asChild>
					<TooltipTrigger asChild>
						{children}
					</TooltipTrigger>
				</DropdownMenuTrigger>
				<TooltipContent side={side}>
					Map layers
				</TooltipContent>
			</Tooltip>
			<DropdownMenuContent
				onCloseAutoFocus={(e) => e.preventDefault()}
				align="start"
				side={side}
				style={{ width }}
			>
				{items.map((item) => {
					const isSelected = selectedKeys.has(item.key);
					return (
						<DropdownMenuItem
							key={item.key}
							onSelect={(e) => {
								e.preventDefault();
								handleToggleItem(item.key);
							}}
							className="flex items-center gap-2 group"
						>
							<Circle
								className="size-2.5 shrink-0"
								style={{ fill: item.color, color: item.color }}
							/>
							<span className="truncate flex-1">{item.name}</span>
							{item.count !== undefined && (
								<span className="text-xs text-muted-foreground tabular-nums">
									{isNaN(item.count) && <Skeleton className="h-4 w-8" />}
									{!isNaN(item.count) && shortNumberFormatter.format(item.count)}
								</span>
							)}
							<div className="w-4 flex items-center justify-center">
								<AnimatePresence>
									{isSelected && (
										<motion.div
											initial={{ opacity: 0, scale: 0.5 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.5 }}
											transition={{ duration: 0.15 }}
										>
											<Check className="w-4 h-4 text-foreground" />
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
