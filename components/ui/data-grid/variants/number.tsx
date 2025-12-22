import { DataGridCellProps } from "../types";
import { DataGridCellWrapper } from "../cell-wrapper";
import { useState, useRef, useCallback, useEffect } from "react";

export function NumberCell<TData>({
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
	const initialValue = cell.getValue() as number;
	const [value, setValue] = useState(String(initialValue ?? ""));
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const prevInitialValueRef = useRef(initialValue);
	if (initialValue !== prevInitialValueRef.current) {
		prevInitialValueRef.current = initialValue;
		setValue(String(initialValue ?? ""));
	}
	
	const onWrapperKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (isFocused) {
				// Handle Backspace to start editing with empty value
				if (event.key === "Backspace") {
					setValue("");
				} else if (
					event.key.length === 1 &&
					!event.ctrlKey &&
					!event.metaKey
				) {
					// Handle typing to pre-fill the value when editing starts
					setValue(event.key);
				}
			}
		},
		[isFocused]
	);

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

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
			<span data-slot="grid-cell-content">{value}</span>
		</DataGridCellWrapper>
	);
}
