"use client"

import { cn } from "cnfast"
import { motion, AnimatePresence } from "motion/react";

import {
	Popover,
	PopoverContent,
	PopoverAnchor,
} from "~/components/ui/popover"

import {
	Check,
	ChevronDown,
	Circle,
	LucideIcon,
	XIcon
} from "lucide-react"

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "~/components/ui/command"

import {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from "react";

export interface ComboboxItem {
	label: string
	value: string
	icon?: LucideIcon
	varColor?: string
	group?: string
}

export interface ComboboxButtonProps {
	label: string
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
			className="flex h-7 items-center gap-1 px-2 text-xs border-transparent bg-secondary text-secondary-foreground font-medium rounded-sm animate-pulse"
		>
			{label}
			<ChevronDown className="size-3 shrink-0 opacity-50" />
		</button>
	)
}

export function ComboboxButton({
	label,
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
	const [showInput, setShowInput] = useState(false)
	const [showPopover, setShowPopover] = useState(false)
	const [internalQuery, setInternalQuery] = useState("")
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const [buttonWidth, setButtonWidth] = useState<number | null>(null)
	const [popoverWidth, setPopoverWidth] = useState(208)
	
	const inputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const popoverRef = useRef<HTMLDivElement>(null)
	const buttonRef = useRef<HTMLButtonElement>(null)

	const isQueryControlled = controlledQuery !== undefined
	const query = isQueryControlled ? controlledQuery : internalQuery

	const handleQueryChange = (newQuery: string) => {
		if (!isQueryControlled) {
			setInternalQuery(newQuery)
		}
		onQueryChange?.(newQuery)
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
		const flat: ComboboxItem[] = []
		for (const items of groupedItems.values()) {
			flat.push(...items)
		}
		return flat
	}, [groupedItems, filteredItems])

	// Reset highlighted index when filtered items change
	useEffect(() => {
		setHighlightedIndex(0)
	}, [query])
	
	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation()
		onValueChange?.([])
	}
	
	const handleSelect = (itemValue: string) => {
		if (multiple) {
			const newValue = value.includes(itemValue)
				? value.filter((v) => v !== itemValue)
				: [...value, itemValue]
			onValueChange?.(newValue)
		} else {
			const newValue = value.includes(itemValue) ? [] : [itemValue]
			onValueChange?.(newValue)
			// Don't close on single select - let user close manually
		}
	}

	const isSelected = (itemValue: string) => value.includes(itemValue)

	const closePopover = useCallback(() => {
		// Hide popover first
		setShowPopover(false)
		setOpen(false)
		// Then morph back to button after a brief delay
		setTimeout(() => {
			setShowInput(false)
			if (!isQueryControlled) {
				setInternalQuery("")
			}
		}, 50)
	}, [isQueryControlled])

	const handleButtonClick = () => {
		// Capture button width before morphing
		if (buttonRef.current) {
			setButtonWidth(buttonRef.current.offsetWidth)
		}
		setShowInput(true)
		setOpen(true)
		// Show popover after morph animation completes
		setTimeout(() => {
			setShowPopover(true)
		}, 150)
	}

	// Disable Radix's built-in open/close - we handle it manually
	const handleOpenChange = () => {}

	// Handle click outside manually
	useEffect(() => {
		if (!open) return

		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node
			const isInsideContainer = containerRef.current?.contains(target)
			const isInsidePopover = popoverRef.current?.contains(target)
			if (!isInsideContainer && !isInsidePopover) {
				closePopover()
			}
		}

		// Delay adding listener to avoid catching the opening click
		const timer = setTimeout(() => {
			document.addEventListener("mousedown", handleClickOutside)
		}, 0)

		return () => {
			clearTimeout(timer)
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [open, closePopover])

	// Auto-focus input when animation completes
	const handleInputAnimationComplete = useCallback(() => {
		if (showInput) {
			inputRef.current?.focus()
		}
	}, [showInput])

	// Calculate optimal popover width based on content
	useEffect(() => {
		if (showPopover) {
			if (width) {
				setPopoverWidth(width);
			} else {
				const maxCharWidth = Math.max(...items.map(item => item.label.length)) + 5;
				const optimalWidth = Math.max(208, Math.min(maxCharWidth * 8 + 16, 400))
				setPopoverWidth(optimalWidth)
			}
		}
	}, [showPopover, items, width])

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<div ref={containerRef} className="inline-flex">
				<PopoverAnchor asChild>
					<motion.div
						className={cn(
							"relative inline-flex items-center overflow-hidden rounded-md border text-sm font-medium",
							showInput
								? "border-input bg-background dark:bg-zinc-800"
								: value.length > 0
									? "border-border bg-background text-foreground"
									: "border-transparent bg-secondary text-secondary-foreground"
						)}
						animate={{
							width: showInput
								? popoverWidth
								: buttonWidth || "auto"
						}}
						transition={{
							type: "spring",
							stiffness: 350,
							damping: 28,
						}}
					>
						<AnimatePresence mode="wait">
							{showInput ? (
								<motion.div
									key="input"
									className="flex h-7 w-full items-center pr-2"
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -10 }}
									transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
									onAnimationComplete={handleInputAnimationComplete}
								>
									<input
										ref={inputRef}
										value={query}
										onChange={(e) => handleQueryChange(e.target.value)}
										onPointerDown={(e) => e.stopPropagation()}
										onKeyDown={(e) => {
											if (e.key === "ArrowDown") {
												e.preventDefault()
												setHighlightedIndex((prev) =>
													prev < flatFilteredItems.length - 1 ? prev + 1 : 0
												)
											}
											if (e.key === "ArrowUp") {
												e.preventDefault()
												setHighlightedIndex((prev) =>
													prev > 0 ? prev - 1 : flatFilteredItems.length - 1
												)
											}
											if (e.key === "Escape") {
												closePopover()
											}
											if (e.key === "Enter" && flatFilteredItems.length > 0) {
												handleSelect(flatFilteredItems[highlightedIndex].value)
											}
										}}
										placeholder={placeholder}
										className="h-7 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
									/>
									<ChevronDown className="size-3 shrink-0 opacity-50" />
								</motion.div>
							) : (
								<motion.button
									key="button"
									ref={buttonRef}
									type="button"
									className={cn("flex h-7 items-center gap-1 px-2 text-xs", className)}
									onClick={handleButtonClick}
									// initial={{ opacity: 0, x: 10 }}
									// animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 10 }}
									transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
								>
									{label}
									{value.length > 0 ? (
										<XIcon 
											className="size-3 shrink-0" 
											onClick={handleClear}
										/>
									) : (
										<ChevronDown className="size-3 shrink-0 opacity-50" />
									)}	
								</motion.button>
							)}
						</AnimatePresence>
					</motion.div>
				</PopoverAnchor>
				<AnimatePresence>
					{showPopover && (
						<PopoverContent
							ref={popoverRef}
							className="p-0"
							side="top"
							align="start"
							sideOffset={4}
							style={{ width: popoverWidth }}
							onOpenAutoFocus={(e) => e.preventDefault()}
							forceMount
							asChild
						>
							<motion.div
								initial={{ opacity: 0, y: 8, scaleY: 0.96 }}
								animate={{ opacity: 1, y: 0, scaleY: 1 }}
								exit={{ opacity: 0, y: 8, scaleY: 0.96 }}
								transition={{ duration: 0.15, ease: "easeOut" }}
								style={{ transformOrigin: "bottom" }}
							>
								<Command shouldFilter={false}>
									<CommandList>
										<CommandEmpty>{emptyMessage}</CommandEmpty>
										{groupedItems && (
											Array.from(groupedItems.entries()).map(([groupName, groupItems]) => (
												<CommandGroup key={groupName} heading={groupName}>
													{groupItems.map((item) => {
														const flatIndex = flatFilteredItems.findIndex((i) => i.value === item.value)
														return (
															<CommandItem
																key={item.value}
																value={item.value}
																onSelect={() => handleSelect(item.value)}
																onMouseEnter={() => setHighlightedIndex(flatIndex)}
																data-highlighted={flatIndex === highlightedIndex}
																className="flex items-center gap-2 !bg-transparent data-[highlighted=true]:!bg-accent data-[highlighted=true]:!text-accent-foreground"
															>
																{item.icon && (
																	<item.icon
																		className="size-4 shrink-0"
																		style={{ color: item.varColor }}
																	/>
																)}
																{!item.icon && (
																	<Circle
																		className="size-2.5 shrink-0"
																		style={{ fill: item.varColor, color: item.varColor }}
																	/>
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
													})}
												</CommandGroup>
											))
										)}

										{!groupedItems && (
											<CommandGroup>
												{flatFilteredItems.map((item, index) => (
													<CommandItem
														key={item.value}
														value={item.value}
														onSelect={() => handleSelect(item.value)}
														onMouseEnter={() => setHighlightedIndex(index)}
														data-highlighted={index === highlightedIndex}
														className="flex items-center gap-2 !bg-transparent data-[highlighted=true]:!bg-accent data-[highlighted=true]:!text-accent-foreground"
													>
														{item.icon && (
															<item.icon
																className="size-4 shrink-0"
																style={{ color: item.varColor }}
															/>
														)}
														{!item.icon && (
															<Circle
																className="size-2.5 shrink-0"
																style={{ fill: item.varColor, color: item.varColor }}
															/>
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
												))}
											</CommandGroup>
										)}
									</CommandList>
								</Command>
							</motion.div>
						</PopoverContent>
					)}
				</AnimatePresence>
			</div>
		</Popover>
	)
}
