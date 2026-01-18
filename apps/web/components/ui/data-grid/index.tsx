"use client";

import { cn } from "~/lib/utils";
import { ComponentProps } from "react";
import type { Direction } from "./types";
import { DataGridSearch } from "./search";
import type { useDataGrid } from "./hook";
import type { Row } from "@tanstack/react-table";
import { DataGridRow, type GetRowProps } from "./row";
import { DataGridColumnHeader } from "./column-header";
import { flexRender, getCommonPinningStyles } from "./lib";

const EMPTY_CELL_SELECTION_SET = new Set<string>();

type UseDataGrid<TData> = Omit<
	ReturnType<typeof useDataGrid<TData>>,
	"dir" | "virtualTotalSize" | "virtualItems" | "measureElement"
>;

interface DataGridProps<TData> extends UseDataGrid<TData>, Omit<ComponentProps<"div">, "contextMenu"> {
	dir?: Direction;
	height?: number;
	stretchColumns?: boolean;
	virtualTotalSize: number;
	virtualItems: ReturnType<typeof useDataGrid<TData>>["virtualItems"];
	measureElement: ReturnType<typeof useDataGrid<TData>>["measureElement"];
	getRowProps?: GetRowProps<TData>;
	onRowHoverChange?: (row: Row<TData>, isHovered: boolean) => void;
	onRowClicked?: (row: Row<TData>) => void;
	border?: boolean;
}

export function DataGrid<TData>({
	dataGridRef,
	headerRef,
	rowMapRef,
	footerRef,
	dir = "ltr",
	table,
	tableMeta,
	virtualTotalSize,
	virtualItems,
	measureElement,
	columns,
	columnSizeVars,
	searchState,
	searchMatchesByRow,
	activeSearchMatch,
	cellSelectionMap,
	focusedCell,
	editingCell,
	rowHeight,
	contextMenu,
	pasteDialog,
	onRowAdd,
	height = 600,
	border = true,
	stretchColumns = false,
	getRowProps,
	onRowHoverChange,
	onRowClicked,
	className,
	...props
}: DataGridProps<TData>) {
	const rows = table.getRowModel().rows;
	const readOnly = tableMeta?.readOnly ?? false;
	const columnPinning = table.getState().columnPinning;
	const columnVisibility = table.getState().columnVisibility;
	
	return (
		<div
			data-slot="grid-wrapper"
			dir={dir}
			{...props}
			className={cn("relative flex w-full flex-col", className)}
		>
			{searchState && <DataGridSearch {...searchState} />}
			
			<div
				role="grid"
				aria-label="Data grid"
				aria-rowcount={rows.length + (onRowAdd ? 1 : 0)}
				aria-colcount={columns.length}
				data-slot="grid"
				tabIndex={0}
				ref={dataGridRef}
				className={cn("relative grid select-none overflow-auto overflow-x-hidden focus:outline-none", border && "border")}
				style={{
					...columnSizeVars,
					maxHeight: `${height}px`,
				}}
			>
				<div
					role="rowgroup"
					data-slot="grid-header"
					ref={headerRef}
					className="sticky top-0 z-10 grid border-b bg-background"
				>
					{table.getHeaderGroups().map((headerGroup, rowIndex) => (
						<div
							key={headerGroup.id}
							role="row"
							aria-rowindex={rowIndex + 1}
							data-slot="grid-header-row"
							tabIndex={-1}
							className="flex w-full"
						>
							{headerGroup.headers.map((header, colIndex) => {
								const sorting = table.getState().sorting;
								const currentSort = sorting.find((sort) => sort.id === header.column.id);
								const isSortable = header.column.getCanSort();
								const ariaSort = isSortable
									? (currentSort?.desc === false ? "ascending" : currentSort?.desc === true ? "descending" : "none")
									: undefined;

								return (
									<div
										key={header.id}
										role="columnheader"
										aria-colindex={colIndex + 1}
										aria-sort={ariaSort}
										data-slot="grid-header-cell"
										tabIndex={-1}
										className={cn("relative", {
											grow: stretchColumns && header.column.id !== "select",
											"border-e": header.column.id !== "select",
										})}
										style={{
											...getCommonPinningStyles({
												column: header.column,
												dir,
											}),
											width: `calc(var(--header-${header.id}-size) * 1px)`,
										}}
									>
										{header.isPlaceholder ? null : typeof header.column.columnDef.header === "function" ? (
											<div className="size-full px-3 py-1.5">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</div>
										) : (
											<DataGridColumnHeader
												header={header}
												table={table}
											/>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<div
					role="rowgroup"
					data-slot="grid-body"
					className="relative grid"
					style={{
						height: `${virtualTotalSize}px`,
						contain: "strict",
					}}
				>
					{virtualItems.map((virtualItem) => {
						const row = rows[virtualItem.index];
						if (!row) return null;

						const cellSelectionKeys = cellSelectionMap?.get(virtualItem.index) ?? EMPTY_CELL_SELECTION_SET;
						const searchMatchColumns = searchMatchesByRow?.get(virtualItem.index) ?? null;
						const isActiveSearchRow = activeSearchMatch?.rowIndex === virtualItem.index;

						return (
							<DataGridRow
								key={row.id}
								row={row}
								tableMeta={tableMeta}
								rowMapRef={rowMapRef}
								virtualItem={virtualItem}
								measureElement={measureElement}
								rowHeight={rowHeight}
								columnVisibility={columnVisibility}
								columnPinning={columnPinning}
								focusedCell={focusedCell}
								editingCell={editingCell}
								cellSelectionKeys={cellSelectionKeys}
								searchMatchColumns={searchMatchColumns}
								activeSearchMatch={isActiveSearchRow
									? activeSearchMatch
									: null
								}
								dir={dir}
								readOnly={readOnly}
								stretchColumns={stretchColumns}
								getRowProps={getRowProps}
								onRowHoverChange={onRowHoverChange}
								onRowClicked={onRowClicked}
							/>
						);
					})}
				</div>
			</div>
		</div>
	);
}
