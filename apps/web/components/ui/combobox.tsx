"use client"

import { cn } from "cnfast"
import { motion, AnimatePresence } from "motion/react";
import { Hint } from "~/components/ui/hint";

import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover"

import {
	Check,
	ChevronDown,
	Circle,
	LucideIcon,
	Search,
	XIcon
} from "lucide-react"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "~/components/ui/command"

import { ReactNode, useMemo, useState } from "react";

export interface ComboboxItem {
	label: string
	value: string
	icon?: LucideIcon
	varColor?: string
	group?: string
}

export interface ComboboxButtonProps {
	label: string
	/** what the filter does: shown in a tooltip while the popover is closed */
	description?: ReactNode
	items: ComboboxItem[]
	multiple?: boolean
	query?: string
	value?: string[]
	onQueryChange?: (query: string) => void
	onValueChange?: (value: string[]) => void
	filterFn?: (item: ComboboxItem, query: string) => boolean
	placeholder?: string
	emptyMessage?: ReactNode | string
	width?: number
	className?: string
}

const defaultFilterFn = (item: ComboboxItem, query: string) =>
	item.label.toLowerCase().startsWith(query.toLowerCase())

export function ComboboxSkeleton({ label }: Pick<ComboboxButtonProps, "label">) {
	return (
		<button
			disabled
			key="button"
			type="button"
			className="flex h-full shrink-0 animate-pulse items-center gap-1.5 px-3 text-sm text-muted-foreground"
		>
			{label}
			<ChevronDown className="size-3 shrink-0 opacity-50" />
		</button>
	)
}

/**
 * A filter button for a bar: the button stays where it is (so nothing around it moves) and a popover opens above it
 * with the search box and the options.
 */
export function ComboboxButton({
	label,
	description,
	items,
	multiple = false,
	query: controlledQuery,
	value = [],
	onQueryChange,
	onValueChange,
	filterFn = defaultFilterFn,
	placeholder = "Search...",
	emptyMessage = "No results found.",
	width,
	className,
}: ComboboxButtonProps) {
	const [open, setOpen] = useState(false)
	const [internalQuery, setInternalQuery] = useState("")
	const [highlightedIndex, setHighlightedIndex] = useState(0)

	const isQueryControlled = controlledQuery !== undefined
	const query = isQueryControlled ? controlledQuery : internalQuery

	const handleQueryChange = (newQuery: string) => {
		if (!isQueryControlled) setInternalQuery(newQuery)
		onQueryChange?.(newQuery)
		setHighlightedIndex(0)
	}

	const handleOpenChange = (next: boolean) => {
		setOpen(next)
		if (!next) {
			setHighlightedIndex(0)
			if (!isQueryControlled) setInternalQuery("")
		}
	}

	const filteredItems = useMemo(() => {
		if (!query) return items
		return items.filter((item) => filterFn(item, query))
	}, [items, query, filterFn])

	// Group items - if any item has a group, use grouping
	const groupedItems = useMemo(() => {
		const hasAnyGroup = filteredItems.some((item) => item.group)
		if (!hasAnyGroup) return null

		const groups = new Map<string, ComboboxItem[]>()
		for (const item of filteredItems) {
			const groupName = item.group || "Other"
			if (!groups.has(groupName)) {
				groups.set(groupName, [])
			}
			groups.get(groupName)!.push(item)
		}
		return groups
	}, [filteredItems])

	// Flat list for keyboard navigation (maintains order across groups)
	const flatFilteredItems = useMemo(() => {
		if (!groupedItems) return filteredItems
		return Array.from(groupedItems.values()).flat()
	}, [groupedItems, filteredItems])

	const handleClear = () => onValueChange?.([])

	const handleSelect = (itemValue: string) => {
		if (multiple) {
			onValueChange?.(value.includes(itemValue)
				? value.filter((v) => v !== itemValue)
				: [...value, itemValue])
		} else {
			// Don't close on single select - let user close manually
			onValueChange?.(value.includes(itemValue) ? [] : [itemValue])
		}
	}

	const isSelected = (itemValue: string) => value.includes(itemValue)

	// "Valid, Expired and 2 more" for the tooltip; selected values that aren't in the current item list show as they are
	const selectedNames = value.map(v => items.find(item => item.value === v)?.label ?? v)
	const selectedNote = selectedNames.length === 0
		? "Nothing selected. Click to choose."
		: `${selectedNames.slice(0, 3).join(", ")}${selectedNames.length > 3 ? ` and ${selectedNames.length - 3} more` : ""}. Click to change.`

	// wide enough for the longest option, unless the filter says otherwise
	const popoverWidth = width ?? (() => {
		const longest = items.reduce((max, item) => Math.max(max, item.label.length), 0)
		return Math.max(208, Math.min((longest + 5) * 8 + 16, 400))
	})()

	const renderItem = (item: ComboboxItem, index: number) => (
		<CommandItem
			key={item.value}
			value={item.value}
			onSelect={() => handleSelect(item.value)}
			onMouseEnter={() => setHighlightedIndex(index)}
			data-highlighted={index === highlightedIndex}
			className="flex items-center gap-2 !bg-transparent data-[highlighted=true]:!bg-accent data-[highlighted=true]:!text-accent-foreground"
		>
			{item.icon ? (
				<item.icon className="size-4 shrink-0" style={{ color: item.varColor }} />
			) : (
				<Circle className="size-2.5 shrink-0" style={{ fill: item.varColor, color: item.varColor }} />
			)}
			<span className="flex-1 truncate">{item.label}</span>
			<AnimatePresence>
				{isSelected(item.value) && (
					<motion.div
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.5 }}
						transition={{ duration: 0.15 }}
					>
						<Check className="size-4 shrink-0" />
					</motion.div>
				)}
			</AnimatePresence>
		</CommandItem>
	)

	const trigger = (
		<PopoverTrigger asChild>
			<button
				type="button"
				className={cn(
					"flex h-full cursor-pointer items-center gap-1.5 pl-3",
					value.length > 0 ? "pr-1" : "pr-3",
					className
				)}
			>
				{label}
				{value.length > 0 ? (
					<span className="font-mono text-xs tabular-nums text-muted-foreground">{value.length}</span>
				) : (
					<ChevronDown className="size-3 shrink-0 opacity-50" />
				)}
			</button>
		</PopoverTrigger>
	)

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<div className="inline-flex h-full shrink-0">
				<PopoverAnchor asChild>
					<div
						className={cn(
							"flex h-full shrink-0 items-center text-sm font-medium transition-colors",
							open
								? "bg-accent/40 text-foreground"
								: value.length > 0
									? "bg-accent/60 text-foreground"
									: "text-muted-foreground hover:bg-accent/40"
						)}
					>
						{description
							? <Hint title={label} body={description} note={selectedNote} disabled={open}>{trigger}</Hint>
							: trigger}

						{value.length > 0 && (
							<button
								type="button"
								onClick={handleClear}
								aria-label={`Clear ${label}`}
								className="mr-1.5 flex size-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
							>
								<XIcon className="size-3.5" />
							</button>
						)}
					</div>
				</PopoverAnchor>
			</div>

			<PopoverContent
				className="overflow-hidden p-0"
				side="top"
				align="start"
				sideOffset={4}
				style={{ width: popoverWidth }}
			>
				<div className="flex h-10 items-center gap-2 border-b px-3">
					<Search className="size-3.5 shrink-0 text-muted-foreground" />
					<input
						value={query}
						onChange={(e) => handleQueryChange(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") {
								e.preventDefault()
								setHighlightedIndex((prev) => prev < flatFilteredItems.length - 1 ? prev + 1 : 0)
							}
							if (e.key === "ArrowUp") {
								e.preventDefault()
								setHighlightedIndex((prev) => prev > 0 ? prev - 1 : flatFilteredItems.length - 1)
							}
							if (e.key === "Enter" && flatFilteredItems.length > 0) {
								e.preventDefault()
								handleSelect(flatFilteredItems[highlightedIndex].value)
							}
						}}
						placeholder={placeholder}
						className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
					/>
				</div>

				<Command shouldFilter={false}>
					<CommandList>
						<CommandEmpty>{emptyMessage}</CommandEmpty>
						{groupedItems
							? Array.from(groupedItems.entries()).map(([groupName, groupItems]) => (
								<CommandGroup key={groupName} heading={groupName}>
									{groupItems.map((item) => renderItem(item, flatFilteredItems.indexOf(item)))}
								</CommandGroup>
							))
							: (
								<CommandGroup>
									{flatFilteredItems.map((item, index) => renderItem(item, index))}
								</CommandGroup>
							)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
