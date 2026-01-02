import { DataGridCellProps } from "../types";
import { Checkbox } from "@radix-ui/react-checkbox";
import { DataGridCellWrapper } from "../cell-wrapper";
import { useState, useRef, useCallback } from "react";

export function CheckboxCell<TData>({
	cell,
	tableMeta,
	rowIndex,
	columnId,
	rowHeight,
	isFocused,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
}: Omit<DataGridCellProps<TData>, "isEditing">) {
	const initialValue = cell.getValue() as boolean;
	const [value, setValue] = useState(Boolean(initialValue));
	const containerRef = useRef<HTMLDivElement>(null);

	const prevInitialValueRef = useRef(initialValue);
	if (initialValue !== prevInitialValueRef.current) {
		prevInitialValueRef.current = initialValue;
		setValue(Boolean(initialValue));
	}

	const onCheckedChange = useCallback(
		(checked: boolean) => {
			if (readOnly) return;
			setValue(checked);
			tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: checked });
		},
		[tableMeta, rowIndex, columnId, readOnly],
	);

	const onWrapperKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (
				isFocused &&
				!readOnly &&
				(event.key === " " || event.key === "Enter")
			) {
				event.preventDefault();
				event.stopPropagation();
				onCheckedChange(!value);
			} else if (isFocused && event.key === "Tab") {
				event.preventDefault();
				tableMeta?.onCellEditingStop?.({
					direction: event.shiftKey ? "left" : "right",
				});
			}
		},
		[isFocused, value, onCheckedChange, tableMeta, readOnly],
	);

	const onWrapperClick = useCallback(
		(event: React.MouseEvent) => {
			if (isFocused && !readOnly) {
				event.preventDefault();
				event.stopPropagation();
				onCheckedChange(!value);
			}
		},
		[isFocused, value, onCheckedChange, readOnly],
	);

	const onCheckboxClick = useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
	}, []);

	const onCheckboxMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	}, []);

	const onCheckboxDoubleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation(), []);

	return (
		<DataGridCellWrapper<TData>
			ref={containerRef}
			cell={cell}
			tableMeta={tableMeta}
			rowIndex={rowIndex}
			columnId={columnId}
			rowHeight={rowHeight}
			isEditing={false}
			isFocused={isFocused}
			isSelected={isSelected}
			isSearchMatch={isSearchMatch}
			isActiveSearchMatch={isActiveSearchMatch}
			readOnly={readOnly}
			className="flex size-full justify-center"
			onClick={onWrapperClick}
			onKeyDown={onWrapperKeyDown}
		>
			<Checkbox
				checked={value}
				onCheckedChange={onCheckedChange}
				disabled={readOnly}
				className="border-primary"
				onClick={onCheckboxClick}
				onMouseDown={onCheckboxMouseDown}
				onDoubleClick={onCheckboxDoubleClick}
			/>
		</DataGridCellWrapper>
	);
}