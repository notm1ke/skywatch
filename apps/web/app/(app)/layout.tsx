import { Metadata, Viewport } from "next";
import { Header } from "~/components/header";
import { AirportProvider } from "~/components/airport-provider";
import { AirspaceProvider } from "~/components/airspace/provider";

const title = () => {
	switch (process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV) {
		case "development":
			return "Skywatch (Dev)";
		case "preview":
			return `Skywatch (Preview)`
		case "production":
		default:
			return "Skywatch"
	}
};

export const metadata: Metadata = {
	title: {
		default: title(),
		template: "Skywatch | %s",
	},
	description: "There is no description for this page.",
	applicationName: "Skywatch",
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<AirportProvider>
			<AirspaceProvider>
				{/* 80% of screen clamped at 2200px for ultrawides */}
				<div className="max-w-[calc(min(100svw*0.8,2200px))] mx-auto border">
					<Header />
					<main>{children}</main>
				</div>
			</AirspaceProvider>
		</AirportProvider>
	);
}