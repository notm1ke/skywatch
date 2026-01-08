import { useWaypointControls } from "./store";
import { Layer, Source } from "react-map-gl/mapbox";

export const WaypointMapStyleLayer = () => {
	const { style } = useWaypointControls();
	
	if (style === "vfr") return (
		<Source
			id="vfr-charts"
			type="raster"
			tiles={["https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/VFR_Terminal/MapServer/tile/{z}/{y}/{x}"]}
			tileSize={256}
		>
			<Layer
				id="vfr-tiles-layer"
				type="raster"
				source="vfr-charts"
			/>
		</Source>
	);
	
	if (style === "ifr") return (
		<Source
			id="ifr-charts"
			type="raster"
			tiles={["https://tiles.arcgis.com/tiles/ssFJjBXIUyZDrSYZ/arcgis/rest/services/IFR_AreaLow/MapServer/tile/{z}/{y}/{x}"]}
			tileSize={256}
		>
			<Layer
				id="ifr-tiles-layer"
				type="raster"
				source="ifr-charts"
			/>
		</Source>
	);

	return null;
}