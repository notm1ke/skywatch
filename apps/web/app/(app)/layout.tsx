import { Metadata, Viewport } from "next";
import { Header } from "~/components/header";
import { AirportProvider } from "~/components/airport-provider";
import { AirspaceProvider } from "~/components/airspace/provider";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
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
				{/* 92% of screen clamped at 2800px for ultrawides (full width below xl so tablets use the whole screen) */}
				<div className="max-w-(--content-max-width) xl:max-w-(--content-max-width-wide) mx-auto border">
					<Header />
					<main>{children}</main>
				</div>
			</AirspaceProvider>
		</AirportProvider>
	);
}