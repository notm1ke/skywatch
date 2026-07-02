import { cn } from "cnfast";
import { DataGridCellProps } from "../types";
import { DataGridCellWrapper } from "../cell-wrapper";
import { ReactNode, useCallback, useRef, useState } from "react";

export function ShortTextCell<TData>({
	cell,
	tableMeta,
	rowIndex,
	columnId,
	rowHeight,
	isEditing,
	isFocused,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
}: DataGridCellProps<TData>) {
	const initialValue = cell.getValue() as string | ReactNode;
	const [value, setValue] = useState(initialValue);
	
	const cellRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const prevInitialValueRef = useRef(initialValue);

	if (initialValue !== prevInitialValueRef.current) {
		prevInitialValueRef.current = initialValue;
		setValue(initialValue);
		if (typeof initialValue === 'string' && cellRef.current && !isEditing) {
			cellRef.current.textContent = initialValue;
		}
	}

	const onBlur = useCallback(() => {
		// Read the current value directly from the DOM to avoid stale state
		const currentValue = cellRef.current?.textContent ?? "";
		if (!readOnly && currentValue !== initialValue) {
			tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: currentValue });
		}
		tableMeta?.onCellEditingStop?.();
	}, [tableMeta, rowIndex, columnId, initialValue, readOnly]);

	const onInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
		const currentValue = event.currentTarget.textContent ?? "";
		setValue(currentValue);
	}, []);

	const onWrapperKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (
				isFocused &&
				event.key.length === 1 &&
				!event.ctrlKey &&
				!event.metaKey
			) {
				// Handle typing to pre-fill the value when editing starts
				setValue(event.key);
				queueMicrotask(() => {
					if (
						cellRef.current &&
						cellRef.current.contentEditable === "true"
					) {
						cellRef.current.textContent = event.key;
						const range = document.createRange();
						const selection = window.getSelection();
						range.selectNodeContents(cellRef.current);
						range.collapse(false);
						selection?.removeAllRanges();
						selection?.addRange(range);
					}
				});
			}
		},
		[isEditing, isFocused, initialValue, tableMeta, rowIndex, columnId],
	);

	const displayValue = value ?? "";

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
			<div
				role="textbox"
				data-slot="grid-cell-content"
				contentEditable={isEditing}
				tabIndex={-1}
				ref={cellRef}
				onBlur={onBlur}
				onInput={onInput}
				suppressContentEditableWarning
				className={cn("size-full overflow-hidden outline-none", {
					"whitespace-nowrap **:inline **:whitespace-nowrap [&_br]:hidden": isEditing
				})}
			>
				{displayValue}
			</div>
		</DataGridCellWrapper>
	);
}

