import { cn } from "cnfast";
import { Check, X } from "lucide-react";
import { DataGridCellProps } from "../types";
import { Badge } from "~/components/ui/badge";
import { getCellKey, getLineCount } from "../lib";
import { DataGridCellWrapper } from "../cell-wrapper";
import { useBadgeOverflow } from "~/hooks/use-badge-overflow";
import { useMemo, useRef, useState, useCallback } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "~/components/ui/popover";

import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from "~/components/ui/command";

export function MultiSelectCell<TData>({
	cell,
	tableMeta,
	rowIndex,
	columnId,
	rowHeight,
	isFocused,
	isEditing,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
}: DataGridCellProps<TData>) {
	const cellValue = useMemo(() => {
		const value = cell.getValue() as string[];
		return value ?? [];
	}, [cell]);

	const cellKey = getCellKey(rowIndex, columnId);
	const prevCellKeyRef = useRef(cellKey);

	const [selectedValues, setSelectedValues] =
		useState<string[]>(cellValue);
	const [searchValue, setSearchValue] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const cellOpts = cell.column.columnDef.meta?.cell;
	const options = cellOpts?.variant === "multi-select" ? cellOpts.options : [];
	const sideOffset = -(containerRef.current?.clientHeight ?? 0);

	const prevCellValueRef = useRef(cellValue);
	if (cellValue !== prevCellValueRef.current) {
		prevCellValueRef.current = cellValue;
		setSelectedValues(cellValue);
	}

	if (prevCellKeyRef.current !== cellKey) {
		prevCellKeyRef.current = cellKey;
		setSearchValue("");
	}

	const onValueChange = useCallback(
		(value: string) => {
			if (readOnly) return;
			const newValues = selectedValues.includes(value)
				? selectedValues.filter((v) => v !== value)
				: [...selectedValues, value];

			setSelectedValues(newValues);
			tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: newValues });
			setSearchValue("");
			queueMicrotask(() => inputRef.current?.focus());
		},
		[selectedValues, tableMeta, rowIndex, columnId, readOnly],
	);

	const removeValue = useCallback(
		(valueToRemove: string, event?: React.MouseEvent) => {
			if (readOnly) return;
			event?.stopPropagation();
			event?.preventDefault();
			const newValues = selectedValues.filter((v) => v !== valueToRemove);
			setSelectedValues(newValues);
			tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: newValues });
			// Focus back on input after removing
			setTimeout(() => inputRef.current?.focus(), 0);
		},
		[selectedValues, tableMeta, rowIndex, columnId, readOnly],
	);

	const clearAll = useCallback(() => {
		if (readOnly) return;
		setSelectedValues([]);
		tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: [] });
		queueMicrotask(() => inputRef.current?.focus());
	}, [tableMeta, rowIndex, columnId, readOnly]);

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen && !readOnly) {
				tableMeta?.onCellEditingStart?.(rowIndex, columnId);
			} else {
				setSearchValue("");
				tableMeta?.onCellEditingStop?.();
			}
		},
		[tableMeta, rowIndex, columnId, readOnly],
	);

	const onOpenAutoFocus: NonNullable<
		React.ComponentProps<typeof PopoverContent>["onOpenAutoFocus"]
	> = useCallback((event) => {
		event.preventDefault();
		inputRef.current?.focus();
	}, []);

	const onWrapperKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (isEditing && event.key === "Escape") {
				event.preventDefault();
				setSelectedValues(cellValue);
				setSearchValue("");
				tableMeta?.onCellEditingStop?.();
			} else if (!isEditing && isFocused && event.key === "Tab") {
				event.preventDefault();
				setSearchValue("");
				tableMeta?.onCellEditingStop?.({
					direction: event.shiftKey ? "left" : "right",
				});
			}
		},
		[isEditing, isFocused, cellValue, tableMeta],
	);

	const onInputKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			// Handle backspace when input is empty - remove last selected item
			if (
				event.key === "Backspace" &&
				searchValue === "" &&
				selectedValues.length > 0
			) {
				event.preventDefault();
				const lastValue = selectedValues[selectedValues.length - 1];
				if (lastValue) {
					removeValue(lastValue);
				}
			}
			// Prevent escape from propagating to close the popover immediately
			// Let the command handle it first
			if (event.key === "Escape") {
				event.stopPropagation();
			}
		},
		[searchValue, selectedValues, removeValue],
	);

	const displayLabels = selectedValues
		.map((val) => options.find((opt) => opt.value === val)?.label ?? val)
		.filter(Boolean);

	const lineCount = getLineCount(rowHeight);

	const { visibleItems: visibleLabels, hiddenCount: hiddenBadgeCount } =
		useBadgeOverflow({
			items: displayLabels,
			getLabel: (label) => label,
			containerRef,
			lineCount,
		});

	return (
		<DataGridCellWrapper<TData>
			ref={containerRef}
			cell={cell}
			tableMeta={tableMeta}
			rowIndex={rowIndex}
			columnId={columnId}
			rowHeight={rowHeight}
			isEditing={isEditing}
			isFocused={isFocused}
			isSelected={isSelected}
			isSearchMatch={isSearchMatch}
			isActiveSearchMatch={isActiveSearchMatch}
			readOnly={readOnly}
			onKeyDown={onWrapperKeyDown}
		>
			{isEditing ? (
				<Popover open={isEditing} onOpenChange={onOpenChange}>
					<PopoverAnchor asChild>
						<div className="absolute inset-0" />
					</PopoverAnchor>
					<PopoverContent
						data-grid-cell-editor=""
						align="start"
						sideOffset={sideOffset}
						className="w-[300px] rounded-none p-0"
						onOpenAutoFocus={onOpenAutoFocus}
					>
						<Command className="**:data-[slot=command-input-wrapper]:h-auto **:data-[slot=command-input-wrapper]:border-none **:data-[slot=command-input-wrapper]:p-0 [&_[data-slot=command-input-wrapper]_svg]:hidden">
							<div className="flex min-h-9 flex-wrap items-center gap-1 border-b px-3 py-1.5">
								{selectedValues.map((value) => {
									const option = options.find(
										(opt) => opt.value === value,
									);
									const label = option?.label ?? value;

									return (
										<Badge
											key={value}
											variant="secondary"
											className="h-5 gap-1 px-1.5 text-xs"
										>
											{label}
											<button
												type="button"
												onClick={(event) =>
													removeValue(value, event)
												}
												onPointerDown={(event) => {
													event.preventDefault();
													event.stopPropagation();
												}}
											>
												<X className="size-3" />
											</button>
										</Badge>
									);
								})}
								<CommandInput
									ref={inputRef}
									value={searchValue}
									onValueChange={setSearchValue}
									onKeyDown={onInputKeyDown}
									placeholder="Search..."
									className="h-auto flex-1 p-0"
								/>
							</div>
							<CommandList className="max-h-full">
								<CommandEmpty>No options found.</CommandEmpty>
								<CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
									{options.map((option) => {
										const isSelected = selectedValues.includes(
											option.value,
										);

										return (
											<CommandItem
												key={option.value}
												value={option.label}
												onSelect={() => onValueChange(option.value)}
											>
												<div
													className={cn(
														"flex size-4 items-center justify-center rounded-sm border border-primary",
														isSelected
															? "bg-primary text-primary-foreground"
															: "opacity-50 [&_svg]:invisible",
													)}
												>
													<Check className="size-3" />
												</div>
												<span>{option.label}</span>
											</CommandItem>
										);
									})}
								</CommandGroup>
								{selectedValues.length > 0 && (
									<>
										<CommandSeparator />
										<CommandGroup>
											<CommandItem
												onSelect={clearAll}
												className="justify-center text-muted-foreground"
											>
												Clear all
											</CommandItem>
										</CommandGroup>
									</>
								)}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			) : null}
			{displayLabels.length > 0 ? (
				<div className="flex flex-wrap items-center gap-1 overflow-hidden">
					{visibleLabels.map((label, index) => (
						<Badge
							key={selectedValues[index]}
							variant="secondary"
							className="h-5 shrink-0 px-1.5 text-xs"
						>
							{label}
						</Badge>
					))}
					{hiddenBadgeCount > 0 && (
						<Badge
							variant="outline"
							className="h-5 shrink-0 px-1.5 text-muted-foreground text-xs"
						>
							+{hiddenBadgeCount}
						</Badge>
					)}
				</div>
			) : null}
		</DataGridCellWrapper>
	);
}