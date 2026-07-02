import airlineDb from "~/lib/datasets/icao-airlines.json";

import { unrollDatum } from ".";
import { useTheme } from "next-themes";
import { TrafficFlow } from "@skywatch/gateway/schemas";
import { ErrorSection } from "~/components/error-section";
import { useEffect, useMemo, useRef, useState } from "react";
import { treemap, hierarchy, treemapSquarify } from "d3-hierarchy";

const CommonAirlineLocalizations = {
	"AAL": "American",
	"SWA": "Southwest",
	"DAL": "Delta",
	"UAL": "United",
	"FDX": "FedEx",
	"ASA": "Alaska",
	"JBU": "JetBlue",
	"UPS": "UPS",
	"FFT": "Frontier Airlines",
	"AAY": "Allegiant",
	"HAL": "Hawaiian",
	"BAW": "British Airways",
	"DLH": "Lufthansa",
	"UAE": "Emirates",
	"QTR": "Qatar Airways",
	"ACA": "Air Canada",
	"AFR": "Air France",
	"KLM": "KLM",
	"ANA": "ANA",
	"THY": "Turkish",
	"CPA": "Cathay Pacific",
	"SIA": "Singapore Airlines",
	"EVA": "EVA Air",
	"ETH": "Ethiopian Airlines",
}

type Cell = {
	id: string;
	value: number;
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
}

type RawCellData = {
	id: string;
	value: number;
}

const collate = (data: RawCellData[], width: number, height: number, theme: string): Cell[] => {
	if (data.length === 0) return []

	const sorted = [...data].sort((a, b) => b.value - a.value)
	const maxValue = sorted[0].value

	// Create hierarchy data structure
	const root = hierarchy({ children: data } as any)
		.sum((d: any) => d.value || 0)
		.sort((a, b) => (b.value || 0) - (a.value || 0))

	// Create treemap layout
	const treemapLayout = treemap<any>()
		.size([width, height])
		.paddingInner(1)
		.round(true)
		.tile(treemapSquarify)

	// Apply layout
	treemapLayout(root)

	// Convert to our cell format
	const cells: Cell[] = []
	root.leaves().forEach((node: any) => {
		cells.push({
			id: node.data.id,
			value: node.data.value,
			x: node.x0,
			y: node.y0,
			width: node.x1 - node.x0,
			height: node.y1 - node.y0,
			color: getColorForValue(node.data.value, maxValue, theme)
		})
	})

	return cells
}

const getColorForValue = (value: number, maxValue: number, theme: string) => {
	const ratio = value / maxValue;
	if (ratio > 0.7) return theme === "light" ? "#7aabf9" : "#3b82f6";
	if (ratio > 0.4) return theme === "light" ? "#457ef9" : "#2563eb";
	if (ratio > 0.2) return theme === "light" ? "#4765c6" : "#1e40af";
	if (ratio > 0.1) return theme === "light" ? "#415ba3" : "#1e3a8a";
	
	return "#4f619b"; 
}

const reservedKeys = ["time", "cumulative"];

export const TrafficByAirlineChart: React.FC<{ chart: TrafficFlow }> = ({ chart }) => {
	const data = unrollDatum(chart.data);
	const containerRef = useRef<HTMLDivElement>(null);
	const { resolvedTheme: theme } = useTheme();
	
	const [hoveredCell, setHoveredCell] = useState<Cell | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [dimensions, setDimensions] = useState({ width: 1600, height: 900 });

	useEffect(() => {
		const updateDimensions = () => {
			if (containerRef.current) {
				const { width, height } = containerRef.current.getBoundingClientRect()
				if (width > 0 && height > 0) {
					setDimensions({ width, height })
				}
			}
		}

		updateDimensions()
		window.addEventListener("resize", updateDimensions)
		return () => window.removeEventListener("resize", updateDimensions)
	}, []);
	
	const dataset = data[0];
	const processed = useMemo(() => {
		if (!dataset) return [];
		const entries = Object.entries(dataset)
			.filter(([key]) => !reservedKeys.includes(key))
			.map(([id, value]) => ({
				id, value: value as number
			}))
			.sort((a, b) => b.value - a.value);

		return collate(entries, dimensions.width, dimensions.height, theme ?? "light");
	}, [dataset, dimensions, theme]);
	
	const airlineInfo = useMemo(() => 
		Object
			.keys(dataset)
			.filter(key => !reservedKeys.includes(key))
			.reduce((result, id) => {
				const record = airlineDb.find(ent => ent.icao_code.toLowerCase() === id.toLowerCase());
				if (record) result[id] = record;
				return result;
			}, {} as Record<string, typeof airlineDb[number]>),
		[dataset]
	);

	const handleMouseMove = (e: React.MouseEvent, cell: Cell) => {
		setHoveredCell(cell)
		setMousePosition({ x: e.clientX, y: e.clientY })
	}
	
	const tooltipContent = (cell: Cell | null) => {
		if (!cell) return null;
		const airline = airlineInfo[cell.id];
		const displayName = CommonAirlineLocalizations[cell.id as keyof typeof CommonAirlineLocalizations]
			?? airline?.airline_name
			?? cell.id;

		return (
			<div
				className="fixed z-50 pointer-events-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl"
				style={{
					left: mousePosition.x + 16,
					top: mousePosition.y + 16,
				}}
			>
				<div className="flex flex-col">
					<div className="flex flex-row items-center gap-2 text-white font-mono font-bold text-sm mb-1">
						{displayName}
					</div>
					<div className="text-gray-300 text-sm">
						IATA Code:{" "}
						<span className="font-semibold text-white">
							{cell.id}
						</span>
					</div>
					<div className="text-gray-300 text-sm">
						Flights:{" "}
						<span className="font-semibold text-white">
							{cell.value.toLocaleString()}
						</span>
					</div>
					<div className="flex-col space-y-1">
						<div className="text-gray-400 text-xs mt-1">
							{((cell.value / dataset.cumulative) * 100).toFixed(1)}% of total traffic
						</div>
					</div>
				</div>
			</div>
		);
	}
	
	if (!data || data.length !== 1) return (
		<div className="w-full h-full justify-center items-center">
			<ErrorSection
				title="Something went wrong"
				error={"Received an unexpected response from the server, please try again."}
			/>
		</div>
	);
	
	return (
		<div ref={containerRef} className="min-h-[250px] h-[250px] w-full relative">
			<svg viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="w-full h-full" preserveAspectRatio="none">
				{processed.map((cell) => (
					<g key={cell.id}>
						<rect
							x={cell.x}
							y={cell.y}
							width={cell.width}
							height={cell.height}
							fill={cell.color}
							strokeWidth={2}
							className="cursor-pointer transition-opacity duration-200 hover:opacity-80 stroke-zinc-50 dark:stroke-[#0a0e13]"
							onMouseMove={(e) => handleMouseMove(e, cell)}
							onMouseLeave={() => setHoveredCell(null)}
						/>
						
						{cell.width > 60 && cell.height > 30 && (
							<text
								x={cell.x + cell.width / 2}
								y={cell.y + cell.height / 2}
								textAnchor="middle"
								dominantBaseline="middle"
								fill="white"
								fontSize={Math.min(cell.width / 4, cell.height / 3, 12)}
								className="pointer-events-none font-mono font-semibold"
								style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
							>
								{cell.id}
							</text>
						)}
					</g>
				))}
			</svg>
		{tooltipContent(hoveredCell)}
		</div>
	);
}