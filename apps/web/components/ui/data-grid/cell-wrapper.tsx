"use client";

import { cn } from "~/lib/utils";
import { getCellKey } from "./lib";
import { useCallback } from "react";
import type { DataGridCellProps } from "./types";
import { useComposedRefs } from "~/lib/compose-refs";

interface DataGridCellWrapperProps<TData> extends DataGridCellProps<TData>, React.ComponentProps<"div"> {}

export function DataGridCellWrapper<TData>({
	tableMeta,
	rowIndex,
	columnId,
	isEditing,
	isFocused,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
	rowHeight,
	className,
	onClick,
	onKeyDown: onKeyDownProp,
	ref,
	...props
}: DataGridCellWrapperProps<TData>) {
	const cellMapRef = tableMeta?.cellMapRef;

	const onCellChange = useCallback(
		(node: HTMLDivElement | null) => {
			if (!cellMapRef) return;
			
			const cellKey = getCellKey(rowIndex, columnId);
			if (node) {
				cellMapRef.current.set(cellKey, node);
				return;
			} 
			
			cellMapRef.current.delete(cellKey);
		},
		[rowIndex, columnId, cellMapRef]
	);

	const composedRef = useComposedRefs(ref, onCellChange);
	const onDoubleClick = useCallback(
		(event: React.MouseEvent) => {
			if (!isEditing) {
				event.preventDefault();
				tableMeta?.onCellDoubleClick?.(rowIndex, columnId);
			}
		},
		[tableMeta, rowIndex, columnId, isEditing],
	);

	const onKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			onKeyDownProp?.(event);

			if (event.defaultPrevented) return;

			if (
				event.key === "ArrowUp" ||
				event.key === "ArrowDown" ||
				event.key === "ArrowLeft" ||
				event.key === "ArrowRight" ||
				event.key === "Home" ||
				event.key === "End" ||
				event.key === "PageUp" ||
				event.key === "PageDown" ||
				event.key === "Tab"
			) {
				return;
			}

			if (isFocused && !isEditing && !readOnly) {
				if (event.key === "F2" || event.key === "Enter") {
					event.preventDefault();
					event.stopPropagation();
					tableMeta?.onCellEditingStart?.(rowIndex, columnId);
					return;
				}

				if (event.key === " ") {
					event.preventDefault();
					event.stopPropagation();
					tableMeta?.onCellEditingStart?.(rowIndex, columnId);
					return;
				}

				if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
					event.preventDefault();
					event.stopPropagation();
					tableMeta?.onCellEditingStart?.(rowIndex, columnId);
				}
			}
		},
		[
			onKeyDownProp,
			isFocused,
			isEditing,
			readOnly,
			tableMeta,
			rowIndex,
			columnId,
		],
	);

	return (
		<div
			role="button"
			data-slot="grid-cell-wrapper"
			data-editing={isEditing ? "" : undefined}
			data-focused={isFocused ? "" : undefined}
			data-selected={isSelected ? "" : undefined}
			tabIndex={isFocused && !isEditing ? 0 : -1}
			{...props}
			ref={composedRef}
			className={cn(
				"size-full hover:cursor-pointer px-2 py-1.5 text-start text-sm outline-none has-data-[slot=checkbox]:pt-2.5 transition-colors duration-75 group-hover/row:bg-zinc-100 dark:group-hover/row:bg-zinc-900/80 group-hover/row:transition-none",
				{
					"ring-1 ring-ring ring-inset": isFocused,
					"bg-yellow-100 dark:bg-yellow-900/30":
						isSearchMatch && !isActiveSearchMatch,
					"bg-orange-200 dark:bg-orange-900/50": isActiveSearchMatch,
					"bg-zinc-100 dark:bg-zinc-900/80":
						isSelected && !isEditing,
					"cursor-default": !isEditing,
					"**:data-[slot=grid-cell-content]:line-clamp-1":
						!isEditing && rowHeight === "short",
					"**:data-[slot=grid-cell-content]:line-clamp-2":
						!isEditing && rowHeight === "medium",
					"**:data-[slot=grid-cell-content]:line-clamp-3":
						!isEditing && rowHeight === "tall",
					"**:data-[slot=grid-cell-content]:line-clamp-4":
						!isEditing && rowHeight === "extra-tall",
				},
				className,
			)}
			onDoubleClick={onDoubleClick}
			onKeyDown={onKeyDown}
		/>
	);
}
