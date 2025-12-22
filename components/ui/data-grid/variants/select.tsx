import { DataGridCellProps } from "../types";
import { Badge } from "~/components/ui/badge";
import { DataGridCellWrapper } from "../cell-wrapper";
import { useState, useRef, useCallback } from "react";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "~/components/ui/select";

export function SelectCell<TData>({
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
	const initialValue = cell.getValue() as string;
	const [value, setValue] = useState(initialValue);
	const containerRef = useRef<HTMLDivElement>(null);
	const cellOpts = cell.column.columnDef.meta?.cell;
	const options = cellOpts?.variant === "select" ? cellOpts.options : [];

	const prevInitialValueRef = useRef(initialValue);
	if (initialValue !== prevInitialValueRef.current) {
		prevInitialValueRef.current = initialValue;
		setValue(initialValue);
	}

	const onOpenChange = useCallback(
		(isOpen: boolean) => {
			if (isOpen && !readOnly) {
				tableMeta?.onCellEditingStart?.(rowIndex, columnId);
			} else {
				tableMeta?.onCellEditingStop?.();
			}
		},
		[tableMeta, rowIndex, columnId, readOnly],
	);

	const selected = options.find((opt) => opt.value === value) ?? {
		label: value,
		value: value
	};

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
		>
			{isEditing && (
				<Select
					value={value}
					open={isEditing}
					onOpenChange={onOpenChange}
				>
					<SelectTrigger
						size="sm"
						className="size-full items-start border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent
						data-grid-cell-editor=""
						// compensate for the wrapper padding
						align="start"
						alignOffset={-8}
						sideOffset={-8}
						className="min-w-[calc(var(--radix-select-trigger-width)+16px)]"
					>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			
			{!isEditing && selected && (
				<span data-slot="grid-cell-content">
					{
						selected.icon
							? (
								<Badge variant={selected.color}>
									<selected.icon />
									{selected.label}
								</Badge>
							)
							: selected.label
					}
				</span>
			)}
		</DataGridCellWrapper>
	);
}
