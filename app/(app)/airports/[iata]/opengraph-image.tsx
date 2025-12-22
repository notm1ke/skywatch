import { unwrap } from "~/lib/actions";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { fetchAirportByIata } from "~/lib/aviation/airports";
import { capitalizeFirst, shortenAirportName } from "~/lib/utils";

export const size = {
	width: 800,
	height: 400,
};

export const contentType = "image/png";

type Params = {
	iata: string;
};

async function loadGoogleFont(font: string, weight: number) {
	const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@${weight}`;
	const css = await (await fetch(url)).text();
	const resource = css.match(
		/src: url\((.+)\) format\('(opentype|truetype)'\)/,
	);

	if (resource) {
		const response = await fetch(resource[1]);
		if (response.status == 200) {
			return await response.arrayBuffer();
		}
	}

	throw new Error("Failed to load font");
}

// figure out something better later - we need to cap it at 26 characters
// though this does make some airport names nonsensical (for a small portion of the entries)
const getBoundedAirportName = (name: string) => {
	const maxLength = 26;
	if (name.length <= maxLength) return name;
	const sliced = name.slice(0, maxLength);

	// check if we're cutting in the middle of a word
	if (name[maxLength] !== ' ' && sliced[maxLength - 1] !== ' ') {
		const lastSpaceIndex = sliced.lastIndexOf(' ');
		if (lastSpaceIndex === -1) return sliced.trim();
		return sliced.slice(0, lastSpaceIndex).trim();
	}

	return sliced.trim();
}

export default async function AirportInspectorOgImage({ params }: { params: Promise<Params> }) {
	const slug = await params;
	const airport = await fetchAirportByIata(slug.iata.toUpperCase())
		.then(unwrap)
		.catch(() => null);

	if (!airport) return NextResponse.json(
		{ message: "Airport not found" },
		{ status: 404 }
	);

	const [country, state] = airport.iso_region!.split("-");
	const designation = capitalizeFirst(airport.type.split('_')[0]);
	const name = getBoundedAirportName(shortenAirportName(airport.name));

	return new ImageResponse(
		<div
			tw="flex h-full bg-white"
			style={{ fontFamily: "Inter" }}
		>
			<div
				tw="flex flex-col justify-between p-16 mb-6"
				style={{ width: "800px" }}
			>
				<div tw="flex flex-col">
					<div tw="flex text-3xl font-bold text-sky-800 mb-12 items-center">
						<svg
							width="30"
							height="30"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							// @ts-expect-error satori lib type conflicts with react dom types
							tw="mr-2"
						>
							<path d="M18.2 12.27 20 6H4l1.8 6.27a1 1 0 0 0 .95.73h10.5a1 1 0 0 0 .96-.73Z" />
							<path d="M8 13v9" />
							<path d="M16 22v-9" />
							<path d="m9 6 1 7" />
							<path d="m15 6-1 7" />
							<path d="M12 6V2" />
							<path d="M13 2h-2" />
						</svg>

						<span style={{ fontFamily: "InstrumentSerif" }}>Skywatch</span>
					</div>

					<div
						tw="flex text-5xl font-bold text-gray-900 mb-4 leading-tight"
						style={{ letterSpacing: "-0.02em" }}
					>
						{name}
					</div>

					<div tw="flex text-2xl text-gray-500">
						{airport.municipality}, {state}
					</div>
				</div>

				<div tw="flex justify-between mt-10" style={{ width: "100%" }}>
					<div tw="flex flex-col">
						<div
							tw="flex text-3xl font-bold text-gray-900"
							style={{ fontFamily: "JetBrainsMono" }}
						>
							{country}
						</div>
						<div tw="flex text-base text-gray-400 mt-1">Country</div>
					</div>
					<div tw="flex flex-col">
						<div
							tw="flex text-3xl font-bold text-gray-900"
							style={{ fontFamily: "JetBrainsMono" }}
						>
							{designation}
						</div>
						<div tw="flex text-base text-gray-400 mt-1">Airport Type</div>
					</div>
					<div tw="flex flex-col">
						<div
							tw="flex text-3xl font-bold text-gray-900"
							style={{ fontFamily: "JetBrainsMono" }}
						>
							{airport.elevation_ft!.toLocaleString()}
						</div>
						<div tw="flex text-base text-gray-400 mt-1">Elevation (ft)</div>
					</div>
					<div tw="flex flex-col">
						<div
							tw="flex text-3xl font-bold text-gray-900"
							style={{ fontFamily: "JetBrainsMono" }}
						>
							{airport.runways.length.toLocaleString()}
						</div>
						<div tw="flex text-base text-gray-400 mt-1">
							Runway{airport.runways.length === 1 ? "" : "s"}
						</div>
					</div>
					<div tw="flex flex-col">
						<div
							tw="flex text-3xl font-bold text-gray-900"
							style={{ fontFamily: "JetBrainsMono" }}
						>
							{airport.frequencies.length.toLocaleString()}
						</div>
						<div tw="flex text-base text-gray-400 mt-1">Frequenc{airport.frequencies.length === 1 ? "y" : "ies"}</div>
					</div>
				</div>
			</div>
		</div>,
		{
			width: 800,
			height: 400,
			fonts: [
				{
					name: "Inter",
					data: await loadGoogleFont("Inter", 400),
					style: "normal",
					weight: 400,
				},
				{
					name: "Inter",
					data: await loadGoogleFont("Inter", 700),
					style: "normal",
					weight: 700,
				},
				{
					name: "JetBrainsMono",
					data: await loadGoogleFont("JetBrains Mono", 700),
					style: "normal",
					weight: 700,
				},
				{
					name: "InstrumentSerif",
					data: await loadGoogleFont("Instrument Serif", 400),
					style: "normal",
					weight: 400,
				},
			],
		},
	);
}
