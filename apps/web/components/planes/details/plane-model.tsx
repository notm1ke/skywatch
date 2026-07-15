import * as THREE from "three";

import { ReactNode, Suspense, useState } from "react";
import { PlaneTypes } from "../plane-types";
import { Canvas } from "@react-three/fiber";
import { PlaneRegistration } from "@/schemas";
import { capitalizeFirst } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { PropulsionTypes } from "../propulsion";
import { JetPhotosRenderer } from "./jetphotos";
import { ImageIcon, Rotate3d } from "lucide-react";
import { ButtonGroup } from "~/components/ui/button-group";
import { useGLTF, OrbitControls, Environment, Center } from "@react-three/drei";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

const FALLBACK = "/plane-models/SR22.glb"

const boeingModels = (registration: PlaneRegistration) => {
	switch (registration.aircraft.model.split("-")[0]) {
		case "707": return "/plane-models/B707.glb";
		case "737": return "/plane-models/B737.glb";
		case "747": return "/plane-models/B747.glb";
		case "757": return "/plane-models/B752.glb";
		case "767": return "/plane-models/B767.glb";
		case "777": return "/plane-models/B777-livery.glb";
		case "787": return "/plane-models/B788.glb";
		default: return FALLBACK;
	}
}

const airbusModels = (registration: PlaneRegistration) => {
	switch (registration.aircraft.model.split("-")[0]) {
		case "A318": return "/plane-models/A318.glb";
		case "A319": return "/plane-models/A319.glb";
		case "A320": return "/plane-models/A320.glb";
		case "A321": return "/plane-models/A321.glb";
		case "A330": return "/plane-models/A330.glb";
		case "A340": return "/plane-models/A340.glb";
		case "A350": return "/plane-models/A350.glb";
		case "A380": return "/plane-models/A380.glb";
		default: return FALLBACK;
	}
}

const bombardierModels = (registration: PlaneRegistration) => {
	switch (registration.aircraft.model.split("-")[0]) {
		case "CL": return "/plane-models/CRJ7.glb";
		default: return FALLBACK;
	}
}

const modelSourceByRegistration = (registration: PlaneRegistration) => {
	switch (registration.aircraft.manufacturer.toLowerCase().split(" ")[0]) {
		case "boeing": return boeingModels(registration);
		case "airbus": return airbusModels(registration);
		case "bombardier": return bombardierModels(registration);
		default: return FALLBACK;
	}
}

function PlaneScene({ src }: { src: string }) {
	const { scene } = useGLTF(src);
	return (
		<Center>
			<primitive object={scene} scale={0.8} />
		</Center>
	);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-sm">{value ?? "—"}</div>
		</div>
	);
}

const TooltipButton = ({ children, tooltip, onClick }: { children: React.ReactNode; onClick: () => void; tooltip: ReactNode }) => {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button variant="secondary" size="icon-sm" onClick={onClick}>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent>
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);
};

const CardHeader = ({ title }: { title: string }) => (
	<div className="flex flex-row px-3 py-2 justify-between">
		<div className="flex flex-row space-x-2 items-center">
			<span className="text-md font-semibold pointer-events-none">
				{title}
			</span>
		</div>
	</div>
);

export const PlanePhotosCard: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const [mode, setMode] = useState<"3d" | "jetphotos">("jetphotos");
	const src = modelSourceByRegistration(registration);

	return (
		<div>
			{mode === "3d" && (
				<Canvas
					style={{ height: '260px', width: '100%' }}
					camera={{ position: [0, 1, 38], fov: 35 }}
					gl={{
						antialias: true,
						toneMapping: THREE.ACESFilmicToneMapping,
						toneMappingExposure: 1.0
					}}
				>
					<ambientLight intensity={0.6} />
					<directionalLight position={[10, 20, 10]} intensity={1.5} />
					<Environment preset="city" />
					<Suspense fallback={null}>
						<PlaneScene src={src} />
					</Suspense>
					<OrbitControls
						enableDamping
						dampingFactor={0.05}
						maxPolarAngle={Math.PI / 2}
						minDistance={5}
						maxDistance={40}
					/>
				</Canvas>
			)}

			{mode === "jetphotos" && (
				<JetPhotosRenderer registration={registration} />
			)}

			{/*<div className="flex flex-row gap-2 justify-center pt-2 pb-1">
				<ButtonGroup>
					<TooltipButton tooltip="3D Model" onClick={() => setMode("3d")}>
						<Rotate3d />
					</TooltipButton>
					<TooltipButton tooltip="JetPhotos" onClick={() => setMode("jetphotos")}>
						<ImageIcon />
					</TooltipButton>
				</ButtonGroup>
			</div>*/}
		</div>
	);
};

export const PlaneDetailsCard: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const title = (s: string) => capitalizeFirst(s.toLowerCase());

	const aircraftType = PlaneTypes.find(t => t.value === registration.aircraft_type)?.label ?? "—";
	const propulsionType = PropulsionTypes.find(t => t.value === registration.engine_type)?.label ?? "—";

	const enginesLabel = registration.engine
		? `${registration.aircraft.engines}× ${title(registration.engine.manufacturer)} ${registration.engine.model}`
		: `${registration.aircraft.engines}×`;

	const airworthyDate = registration.airworthy_date
		? new Date(registration.airworthy_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
		: null;

	return (
		<div>
			<CardHeader title="Plane Details" />
			<div className="border-t p-3 grid grid-cols-3 gap-x-4 gap-y-3">
				<InfoRow
					label="Aircraft"
					value={`${title(registration.aircraft.manufacturer)} ${registration.aircraft.model}`}
				/>
				<InfoRow label="Serial Number" value={registration.serial_number} />
				<InfoRow label="Manufactured" value={registration.mfg_year} />
				<InfoRow label="Airworthy Date" value={airworthyDate} />
				<InfoRow label="Transponder" value={registration.mode_s_hex} />
				<InfoRow label="Aircraft Type" value={aircraftType} />
				<InfoRow label="Propulsion" value={propulsionType} />
				<InfoRow label="Engines" value={enginesLabel} />
				<InfoRow label="Seats" value={registration.aircraft.seats} />
			</div>
		</div>
	);
};

export const PlaneModel: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => (
	<div className="divide-y">
		<PlanePhotosCard registration={registration} />
		<PlaneDetailsCard registration={registration} />
	</div>
);
